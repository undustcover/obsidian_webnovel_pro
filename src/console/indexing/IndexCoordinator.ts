import type { AdapterSource } from '../adapters';
import type { ConsoleProjectConfig } from '../config';
import type { EntityIndexService } from './EntityIndexService';
import type { IndexSnapshot } from './IndexSnapshot';

export type IndexFileEvent =
	| { type: 'create' | 'modify'; source: AdapterSource }
	| { type: 'delete'; path: string }
	| { type: 'rename'; oldPath: string; source: AdapterSource };

export class IndexCoordinator {
	private lastAffectedEntityKeys: readonly string[] = [];
	private disposed = false;
	constructor(private index: EntityIndexService) {}
	getLastAffectedEntityKeys(): readonly string[] { return this.lastAffectedEntityKeys; }
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.lastAffectedEntityKeys = [];
		this.index.dispose();
	}

	apply(project: ConsoleProjectConfig, event: IndexFileEvent): IndexSnapshot | undefined {
		if (this.disposed) return undefined;
		const before = this.index.getSnapshot();
		const oldPath = event.type === 'rename' ? event.oldPath : event.type === 'delete' ? event.path : event.source.path;
		const oldRecords = before?.records.filter(record => record.source.path === oldPath) || [];
		let snapshot: IndexSnapshot;
		if (event.type === 'delete') snapshot = this.index.deleteContribution(project.projectId, event.path);
		else if (event.type === 'rename') snapshot = this.index.renameContribution(project.projectId, event.oldPath, event.source);
		else snapshot = this.index.updateContribution(project.projectId, event.source.path, this.index.parseSource(event.source));
		const newPath = event.type === 'delete' ? undefined : event.source.path;
		const newRecords = newPath ? snapshot.records.filter(record => record.source.path === newPath) : [];
		const affected = new Set([...oldRecords, ...newRecords].map(record => record.key));
		for (const record of [...oldRecords, ...newRecords]) {
			for (const ref of [record.id, record.key].filter((value): value is string => Boolean(value))) {
				for (const key of before?.relations.affectedByTarget(ref) || []) affected.add(key);
				for (const key of snapshot.relations.affectedByTarget(ref)) affected.add(key);
			}
		}
		this.lastAffectedEntityKeys = [...affected].sort();
		return snapshot;
	}
}
