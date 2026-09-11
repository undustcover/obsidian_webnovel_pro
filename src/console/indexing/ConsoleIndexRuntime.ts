import { TFile } from 'obsidian';
import { ConsoleAdapterRegistry, LegacyChapterAdapter, LegacyForeshadowingAdapter, LegacyLoreAdapter, LegacyTimedTaskAdapter, LegacyTimelineAdapter, PropertiesEntityAdapter } from '../adapters';
import { resolveConsoleProjects, type ConsoleConfigDiagnostic, type ConsoleProjectConfig } from '../config';
import type { WebNovelAssistantPlugin } from '../../types/plugin';
import { getPluginDir } from '../../utils/platform';
import { EntityIndexService, type IndexServiceState } from './EntityIndexService';
import { IndexCache, type IndexCachePort } from './IndexCache';
import { IndexCoordinator, type IndexFileEvent } from './IndexCoordinator';
import { ObsidianIndexSourcePort } from './ObsidianIndexSourcePort';
import { ProjectScopeResolver } from './ProjectScopeResolver';

export type ConsoleRuntimeFileEvent =
	| { type: 'create' | 'modify'; file: TFile }
	| { type: 'delete'; path: string }
	| { type: 'rename'; file: TFile; oldPath: string };

export interface ConsoleReconfigureResult {
	projectIds: string[];
	activeProjectId?: string;
}

export type ConsoleRecoveryMode = 'retry' | 'rebuild';

export interface ConsoleRecoveryResult {
	projectId: string;
	mode: ConsoleRecoveryMode;
	snapshotVersion: string;
	recordCount: number;
}

export type ConsoleRuntimeChange = 'current' | 'configuration' | 'active-project' | 'index-state' | 'snapshot' | 'cache';

export interface ConsoleRuntimeSnapshotSummary {
	readonly projectId: string;
	readonly version: string;
	readonly recordCount: number;
}

export interface ConsoleRuntimeEvent {
	readonly sequence: number;
	readonly change: ConsoleRuntimeChange;
	readonly projectIds: readonly string[];
	readonly activeProjectId?: string;
	readonly projectId?: string;
	readonly state?: IndexServiceState;
	readonly snapshot?: ConsoleRuntimeSnapshotSummary;
	readonly configDiagnostics: readonly ConsoleConfigDiagnostic[];
	readonly cacheError?: string;
}

export type ConsoleRuntimeListener = (event: ConsoleRuntimeEvent) => void;

interface ProjectIndexContext {
	project: ConsoleProjectConfig;
	index: EntityIndexService;
	coordinator: IndexCoordinator;
	cache: IndexCache;
	disposed: boolean;
	unsubscribers: Array<() => void>;
	dispose(): void;
}

const cacheFileName = (projectId: string): string =>
	`console-index-v1-${projectId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;

export class ConsoleIndexRuntime {
	readonly sourcePort: ObsidianIndexSourcePort;
	private contexts = new Map<string, ProjectIndexContext>();
	private cacheErrors = new Map<string, string>();
	private configDiagnostics: ConsoleConfigDiagnostic[];
	private activeProjectId?: string;
	private readonly scope = new ProjectScopeResolver();
	private reconfigurationEvents: ConsoleRuntimeFileEvent[] | null = null;
	private readonly recoveringProjects = new Set<string>();
	private readonly listeners = new Set<ConsoleRuntimeListener>();
	private eventSequence = 0;

	constructor(private plugin: WebNovelAssistantPlugin) {
		const resolved = resolveConsoleProjects(plugin.settings);
		this.configDiagnostics = resolved.diagnostics;
		this.activeProjectId = resolved.projects[0]?.projectId;
		this.sourcePort = new ObsidianIndexSourcePort(plugin.app, this.scope);
		for (const project of resolved.projects) this.contexts.set(project.projectId, this.createContext(project));
	}

	getProjectIds(): string[] { return [...this.contexts.keys()]; }
	getConfigDiagnostics(): ConsoleConfigDiagnostic[] { return structuredClone(this.configDiagnostics); }
	getActiveProjectId(): string | undefined { return this.activeProjectId; }
	getCacheError(projectId = this.activeProjectId): string | undefined { return projectId ? this.cacheErrors.get(projectId) : undefined; }
	setActiveProject(projectId: string): boolean {
		if (!this.contexts.has(projectId)) return false;
		if (this.activeProjectId === projectId) return true;
		this.activeProjectId = projectId;
		this.emit('active-project', projectId);
		return true;
	}
	getIndex(projectId = this.activeProjectId): EntityIndexService | undefined {
		return projectId ? this.contexts.get(projectId)?.index : undefined;
	}
	getProjectConfig(projectId = this.activeProjectId): ConsoleProjectConfig | undefined {
		return projectId ? this.contexts.get(projectId)?.project : undefined;
	}
	subscribe(listener: ConsoleRuntimeListener): () => void {
		this.listeners.add(listener);
		listener(this.createEvent('current', this.activeProjectId));
		return () => this.listeners.delete(listener);
	}

	private createContext(project: ConsoleProjectConfig): ProjectIndexContext {
		const registry = new ConsoleAdapterRegistry([
			new PropertiesEntityAdapter(project.fieldAliases), new LegacyTimelineAdapter(), new LegacyForeshadowingAdapter(),
			new LegacyTimedTaskAdapter(), new LegacyChapterAdapter(), new LegacyLoreAdapter(),
		]);
		const index = new EntityIndexService(this.sourcePort, registry, this.scope);
		const coordinator = new IndexCoordinator(index);
		const cachePath = `${getPluginDir(this.plugin)}/${cacheFileName(project.projectId)}`;
		const adapter = this.plugin.app.vault.adapter;
		const port: IndexCachePort = {
			read: async () => await adapter.exists(cachePath) ? adapter.read(cachePath) : null,
			write: async (content) => { await adapter.write(cachePath, content); },
			remove: async () => { if (await adapter.exists(cachePath)) await adapter.remove(cachePath); },
		};
		let context!: ProjectIndexContext;
		context = {
			project,
			index,
			coordinator,
			cache: new IndexCache(port),
			disposed: false,
			unsubscribers: [],
			dispose: () => {
				if (context.disposed) return;
				context.disposed = true;
				for (const unsubscribe of context.unsubscribers) unsubscribe();
				context.unsubscribers = [];
				context.coordinator.dispose();
			},
		};
		context.unsubscribers.push(
			index.onState(() => this.emitContextEvent(context, 'index-state')),
			index.onSnapshot(() => this.emitContextEvent(context, 'snapshot')),
		);
		return context;
	}

	async initialize(): Promise<void> {
		for (const context of this.contexts.values()) {
			const cached = await context.cache.load();
			if (context.disposed) continue;
			if (cached && cached.projectId === context.project.projectId) context.index.restore(cached);
			const snapshot = await context.index.build(context.project);
			if (context.disposed) continue;
			await this.saveContextSnapshot(context, snapshot, this.cacheErrors);
		}
	}

	async reconfigure(projects: readonly ConsoleProjectConfig[]): Promise<ConsoleReconfigureResult> {
		if (this.reconfigurationEvents) throw new Error('Console reconfiguration is already in progress.');
		const normalized = resolveConsoleProjects({ consoleProjects: projects });
		const configError = normalized.diagnostics.find(item => item.severity === 'error');
		if (configError) throw new Error(`${configError.code}: ${configError.message}`);

		const candidates = new Map<string, ProjectIndexContext>();
		const candidateErrors = new Map<string, string>();
		const snapshots = new Map<string, Awaited<ReturnType<EntityIndexService['build']>>>();
		this.reconfigurationEvents = [];
		try {
			for (const project of normalized.projects) {
				const context = this.createContext(project);
				candidates.set(project.projectId, context);
				const cached = await context.cache.load();
				if (cached && cached.projectId === project.projectId) context.index.restore(cached);
				snapshots.set(project.projectId, await context.index.build(project));
			}
			for (const [projectId, snapshot] of snapshots) await this.saveContextSnapshot(candidates.get(projectId)!, snapshot, candidateErrors);
			while (this.reconfigurationEvents.length > 0) {
				const pending = this.reconfigurationEvents.splice(0);
				for (const event of pending) await this.applyFileEvent(candidates, candidateErrors, event);
			}

			const oldContexts = this.contexts;
			const oldActive = this.activeProjectId;
			this.contexts = candidates;
			this.cacheErrors = candidateErrors;
			this.configDiagnostics = normalized.diagnostics;
			this.activeProjectId = oldActive && candidates.has(oldActive) ? oldActive : normalized.projects[0]?.projectId;
			this.reconfigurationEvents = null;
			for (const context of oldContexts.values()) context.dispose();
			this.emit('configuration', this.activeProjectId);
			return { projectIds: this.getProjectIds(), activeProjectId: this.activeProjectId };
		} catch (error) {
			for (const context of candidates.values()) context.dispose();
			this.reconfigurationEvents = null;
			throw error;
		}
	}

	retry(projectId = this.activeProjectId): Promise<ConsoleRecoveryResult> {
		return this.recover('retry', projectId);
	}

	rebuild(projectId = this.activeProjectId): Promise<ConsoleRecoveryResult> {
		return this.recover('rebuild', projectId);
	}

	private async recover(mode: ConsoleRecoveryMode, projectId?: string): Promise<ConsoleRecoveryResult> {
		const context = projectId ? this.contexts.get(projectId) : undefined;
		if (!projectId || !context || context.disposed) throw new Error(`CONSOLE_PROJECT_UNKNOWN: ${projectId || '(none)'}`);
		if (this.recoveringProjects.has(projectId)) throw new Error(`INDEX_RECOVERY_IN_PROGRESS: ${projectId}`);

		this.recoveringProjects.add(projectId);
		try {
			if (mode === 'rebuild') await context.cache.clear();
			const snapshot = await context.index.build(context.project);
			if (context.disposed || this.contexts.get(projectId) !== context) throw new Error(`CONSOLE_PROJECT_UNKNOWN: ${projectId}`);
			await this.saveContextSnapshot(context, snapshot, this.cacheErrors);
			return { projectId, mode, snapshotVersion: snapshot.version, recordCount: snapshot.records.length };
		} finally {
			this.recoveringProjects.delete(projectId);
		}
	}

	async handleFileEvent(event: ConsoleRuntimeFileEvent): Promise<void> {
		this.reconfigurationEvents?.push(event);
		await this.applyFileEvent(this.contexts, this.cacheErrors, event);
	}

	async refreshPaths(paths: readonly string[]): Promise<string> {
		const projectId = this.activeProjectId;
		const context = projectId ? this.contexts.get(projectId) : undefined;
		if (!projectId || !context || context.disposed) throw new Error(`CONSOLE_PROJECT_UNKNOWN: ${projectId || '(none)'}`);
		let refreshed = false;
		for (const path of [...new Set(paths.map(value => value.replace(/\\/g, '/')))].sort()) {
			if (!path.toLocaleLowerCase().endsWith('.md') || !this.scope.contains(context.project, path)) continue;
			const file = this.plugin.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) await this.applyFileEvent(this.contexts, this.cacheErrors, { type: 'modify', file });
			else await this.applyFileEvent(this.contexts, this.cacheErrors, { type: 'delete', path });
			refreshed = true;
		}
		if (!refreshed) {
			const result = await this.retry(projectId);
			return result.snapshotVersion;
		}
		const version = context.index.getSnapshot()?.version;
		if (!version) throw new Error('INDEX_REFRESH_UNAVAILABLE');
		return version;
	}

	private async applyFileEvent(contexts: Map<string, ProjectIndexContext>, cacheErrors: Map<string, string>, event: ConsoleRuntimeFileEvent): Promise<void> {
		let source: Awaited<ReturnType<ObsidianIndexSourcePort['toSource']>> | undefined;
		for (const context of contexts.values()) {
			if (context.disposed) continue;
			const { project } = context;
			let indexEvent: IndexFileEvent | undefined;
			if (event.type === 'delete') {
				if (this.scope.contains(project, event.path)) indexEvent = { type: 'delete', path: event.path };
			} else if (event.type === 'rename') {
				const wasInScope = this.scope.contains(project, event.oldPath);
				const isInScope = this.scope.contains(project, event.file.path);
				if (wasInScope && !isInScope) indexEvent = { type: 'delete', path: event.oldPath };
				else if (isInScope) {
					source ||= await this.sourcePort.toSource(event.file);
					indexEvent = { type: 'rename', oldPath: event.oldPath, source };
				}
			} else if (this.scope.contains(project, event.file.path)) {
				source ||= await this.sourcePort.toSource(event.file);
				indexEvent = { type: event.type, source };
			}
			if (!indexEvent) continue;
			const snapshot = context.coordinator.apply(project, indexEvent);
			if (snapshot) {
				await this.saveContextSnapshot(context, snapshot, cacheErrors);
			}
		}
	}

	private async saveContextSnapshot(context: ProjectIndexContext, snapshot: Awaited<ReturnType<EntityIndexService['build']>>, cacheErrors: Map<string, string>): Promise<void> {
		if (context.disposed) return;
		try {
			await context.cache.save(snapshot);
			cacheErrors.delete(context.project.projectId);
		} catch (error) {
			cacheErrors.set(context.project.projectId, error instanceof Error ? error.message : String(error));
		}
		this.emitContextEvent(context, 'cache');
	}

	private emitContextEvent(context: ProjectIndexContext, change: Extract<ConsoleRuntimeChange, 'index-state' | 'snapshot' | 'cache'>): void {
		if (context.disposed || this.contexts.get(context.project.projectId) !== context) return;
		if (change === 'index-state' && context.index.getState().status === 'idle' && context.index.getSnapshot()) return;
		this.emit(change, context.project.projectId);
	}

	private emit(change: ConsoleRuntimeChange, projectId?: string): void {
		if (!this.listeners.size) return;
		const event = this.createEvent(change, projectId);
		for (const listener of this.listeners) listener(event);
	}

	private createEvent(change: ConsoleRuntimeChange, projectId?: string): ConsoleRuntimeEvent {
		const context = projectId ? this.contexts.get(projectId) : undefined;
		const snapshot = context?.index.getSnapshot();
		const state = context?.index.getState();
		const publicState = state ? structuredClone(state) : undefined;
		if (publicState?.status === 'degraded') Object.freeze(publicState.failedPaths);
		if (publicState) Object.freeze(publicState);
		const diagnostics = this.getConfigDiagnostics().map(diagnostic => Object.freeze(diagnostic));
		return Object.freeze({
			sequence: ++this.eventSequence,
			change,
			projectIds: Object.freeze(this.getProjectIds()),
			activeProjectId: this.activeProjectId,
			projectId,
			state: publicState,
			snapshot: snapshot ? Object.freeze({ projectId: snapshot.projectId, version: snapshot.version, recordCount: snapshot.records.length }) : undefined,
			configDiagnostics: Object.freeze(diagnostics),
			cacheError: projectId ? this.cacheErrors.get(projectId) : undefined,
		});
	}

	destroy(): void {
		for (const context of this.contexts.values()) context.dispose();
		this.contexts.clear();
		this.cacheErrors.clear();
		this.activeProjectId = undefined;
		this.reconfigurationEvents = null;
		this.recoveringProjects.clear();
		this.listeners.clear();
	}
}
