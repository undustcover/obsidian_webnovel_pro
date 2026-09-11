import type { AdapterSource, ConsoleAdapterRegistry } from '../adapters';
import type { ConsoleProjectConfig } from '../config';
import type { DiagnosticRef, EntityRecord } from '../domain';
import { IndexSnapshot } from './IndexSnapshot';
import { ProjectScopeResolver } from './ProjectScopeResolver';

export interface IndexSourcePort {
	listMarkdownFiles(project: ConsoleProjectConfig): Promise<AdapterSource[]>;
}

export type IndexServiceState =
	| { status: 'idle'; snapshotVersion?: string }
	| { status: 'indexing'; processed: number; total: number }
	| { status: 'degraded'; snapshotVersion: string; failedPaths: string[] }
	| { status: 'error'; message: string };

export class EntityIndexService {
	private snapshot?: IndexSnapshot;
	private state: IndexServiceState = { status: 'idle' };
	private sequence = 0;
	private contributions = new Map<string, EntityRecord[]>();
	private stateListeners = new Set<(state: IndexServiceState) => void>();
	private snapshotListeners = new Set<(snapshot: IndexSnapshot) => void>();
	private disposed = false;

	constructor(
		private sourcePort: IndexSourcePort,
		private adapters: ConsoleAdapterRegistry,
		private scope = new ProjectScopeResolver(),
		private yieldControl: () => Promise<void> = () => new Promise(resolve => window.setTimeout(resolve, 0)),
	) {}

	onState(listener: (state: IndexServiceState) => void): () => void { if (this.disposed) return () => undefined; this.stateListeners.add(listener); return () => this.stateListeners.delete(listener); }
	onSnapshot(listener: (snapshot: IndexSnapshot) => void): () => void { if (this.disposed) return () => undefined; this.snapshotListeners.add(listener); return () => this.snapshotListeners.delete(listener); }
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.stateListeners.clear();
		this.snapshotListeners.clear();
	}
	getState(): IndexServiceState { return this.state; }
	getSnapshot(): IndexSnapshot | undefined { return this.snapshot; }
	parseSource(source: AdapterSource): EntityRecord[] { return this.adapters.parse(source); }
	restore(snapshot: IndexSnapshot): void {
		this.contributions = new Map();
		for (const record of snapshot.records) {
			const entries = this.contributions.get(record.source.path) || [];
			entries.push(record);
			this.contributions.set(record.source.path, entries);
		}
		this.snapshot = snapshot;
		this.setState({ status: 'idle', snapshotVersion: snapshot.version });
		for (const listener of this.snapshotListeners) listener(snapshot);
	}

	private setState(state: IndexServiceState): void { this.state = state; for (const listener of this.stateListeners) listener(state); }

	async build(project: ConsoleProjectConfig): Promise<IndexSnapshot> {
		try {
			const files = (await this.sourcePort.listMarkdownFiles(project)).filter((file) => this.scope.contains(project, file.path));
			this.setState({ status: 'indexing', processed: 0, total: files.length });
			const nextContributions = new Map<string, EntityRecord[]>();
			const diagnostics: DiagnosticRef[] = [];
			const failedPaths: string[] = [];
			for (let index = 0; index < files.length; index++) {
				const file = files[index];
				try { nextContributions.set(file.path, this.adapters.parse(file)); }
				catch (error) {
					failedPaths.push(file.path);
					diagnostics.push({ ruleId: 'INDEX_SOURCE_PARSE_FAILED', severity: 'error', entityKey: `source:${file.path}`, message: error instanceof Error ? error.message : String(error), evidence: [{ path: file.path }] });
				}
				this.setState({ status: 'indexing', processed: index + 1, total: files.length });
				if ((index + 1) % project.performance.batchSize === 0) await this.yieldControl();
			}
			this.contributions = nextContributions;
			const snapshot = this.publish(project.projectId, diagnostics);
			this.setState(failedPaths.length ? { status: 'degraded', snapshotVersion: snapshot.version, failedPaths } : { status: 'idle', snapshotVersion: snapshot.version });
			return snapshot;
		} catch (error) {
			this.setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
			throw error;
		}
	}

	updateContribution(projectId: string, path: string, records: EntityRecord[], diagnostics: DiagnosticRef[] = []): IndexSnapshot {
		this.contributions.set(path, records);
		return this.publish(projectId, diagnostics);
	}

	deleteContribution(projectId: string, path: string): IndexSnapshot {
		this.contributions.delete(path);
		return this.publish(projectId);
	}

	renameContribution(projectId: string, oldPath: string, newSource: AdapterSource): IndexSnapshot {
		this.contributions.delete(oldPath);
		this.contributions.set(newSource.path, this.parseSource(newSource));
		return this.publish(projectId);
	}

	private publish(projectId: string, diagnostics: DiagnosticRef[] = []): IndexSnapshot {
		const records = [...this.contributions.values()].flat();
		const snapshot = new IndexSnapshot(`${Date.now()}-${++this.sequence}`, projectId, records, diagnostics);
		this.snapshot = snapshot;
		for (const listener of this.snapshotListeners) listener(snapshot);
		return snapshot;
	}
}
