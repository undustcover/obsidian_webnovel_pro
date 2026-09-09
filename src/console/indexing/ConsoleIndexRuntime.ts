import type { TFile } from 'obsidian';
import { ConsoleAdapterRegistry, LegacyChapterAdapter, LegacyForeshadowingAdapter, LegacyLoreAdapter, LegacyTimedTaskAdapter, LegacyTimelineAdapter, PropertiesEntityAdapter } from '../adapters';
import { resolveConsoleProjects, type ConsoleProjectConfig } from '../config';
import type { WebNovelAssistantPlugin } from '../../types/plugin';
import { getPluginDir } from '../../utils/platform';
import { EntityIndexService } from './EntityIndexService';
import { IndexCache, type IndexCachePort } from './IndexCache';
import { IndexCoordinator, type IndexFileEvent } from './IndexCoordinator';
import { ObsidianIndexSourcePort } from './ObsidianIndexSourcePort';
import { ProjectScopeResolver } from './ProjectScopeResolver';

interface ProjectIndexContext {
	project: ConsoleProjectConfig;
	index: EntityIndexService;
	coordinator: IndexCoordinator;
	cache: IndexCache;
}

const cacheFileName = (projectId: string): string =>
	`console-index-v1-${projectId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;

export class ConsoleIndexRuntime {
	readonly sourcePort: ObsidianIndexSourcePort;
	private readonly contexts = new Map<string, ProjectIndexContext>();
	private readonly cacheErrors = new Map<string, string>();
	private activeProjectId?: string;
	private readonly scope = new ProjectScopeResolver();

	constructor(private plugin: WebNovelAssistantPlugin) {
		const resolved = resolveConsoleProjects(plugin.settings);
		this.activeProjectId = resolved.projects[0]?.projectId;
		this.sourcePort = new ObsidianIndexSourcePort(plugin.app, this.scope);
		for (const project of resolved.projects) this.contexts.set(project.projectId, this.createContext(project));
	}

	getProjectIds(): string[] { return [...this.contexts.keys()]; }
	getActiveProjectId(): string | undefined { return this.activeProjectId; }
	getCacheError(projectId = this.activeProjectId): string | undefined { return projectId ? this.cacheErrors.get(projectId) : undefined; }
	setActiveProject(projectId: string): boolean {
		if (!this.contexts.has(projectId)) return false;
		this.activeProjectId = projectId;
		return true;
	}
	getIndex(projectId = this.activeProjectId): EntityIndexService | undefined {
		return projectId ? this.contexts.get(projectId)?.index : undefined;
	}
	getProjectConfig(projectId = this.activeProjectId): ConsoleProjectConfig | undefined {
		return projectId ? this.contexts.get(projectId)?.project : undefined;
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
		return { project, index, coordinator, cache: new IndexCache(port) };
	}

	async initialize(): Promise<void> {
		for (const context of this.contexts.values()) {
			const cached = await context.cache.load();
			if (cached && cached.projectId === context.project.projectId) context.index.restore(cached);
			const snapshot = await context.index.build(context.project);
			try {
				await context.cache.save(snapshot);
				this.cacheErrors.delete(context.project.projectId);
			} catch (error) {
				this.cacheErrors.set(context.project.projectId, error instanceof Error ? error.message : String(error));
			}
		}
	}

	async handleFileEvent(event: { type: 'create' | 'modify'; file: TFile } | { type: 'delete'; path: string } | { type: 'rename'; file: TFile; oldPath: string }): Promise<void> {
		let source: Awaited<ReturnType<ObsidianIndexSourcePort['toSource']>> | undefined;
		for (const context of this.contexts.values()) {
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
				try {
					await context.cache.save(snapshot);
					this.cacheErrors.delete(project.projectId);
				} catch (error) {
					this.cacheErrors.set(project.projectId, error instanceof Error ? error.message : String(error));
				}
			}
		}
	}

	destroy(): void {
		this.contexts.clear();
		this.cacheErrors.clear();
		this.activeProjectId = undefined;
	}
}
