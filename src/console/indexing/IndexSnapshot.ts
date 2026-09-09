import type { DiagnosticRef, EntityRecord } from '../domain';
import { FullTextIndex, type EntitySearchRequest, type EntitySearchResult } from './FullTextIndex';
import { IdRegistry } from './IdRegistry';
import { RelationIndex } from './RelationIndex';
import { INDEX_SCHEMA_VERSION } from '../domain';

export class IndexSnapshot {
	readonly schemaVersion = INDEX_SCHEMA_VERSION;
	readonly byKey: ReadonlyMap<string, EntityRecord>;
	readonly idRegistry: IdRegistry;
	readonly relations: RelationIndex;
	readonly diagnostics: readonly DiagnosticRef[];
	private fullText: FullTextIndex;

	constructor(readonly version: string, readonly projectId: string, readonly records: readonly EntityRecord[], diagnostics: readonly DiagnosticRef[] = []) {
		this.byKey = new Map(records.map((record) => [record.key, record]));
		this.idRegistry = new IdRegistry(records);
		this.relations = new RelationIndex(records);
		this.diagnostics = [...diagnostics, ...records.flatMap((record) => record.diagnostics), ...this.idRegistry.diagnostics];
		this.fullText = new FullTextIndex(records);
	}

	search(request: EntitySearchRequest): EntitySearchResult { return this.fullText.search(request); }
}
