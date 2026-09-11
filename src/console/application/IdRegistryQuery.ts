import { ENTITY_ID_PREFIX, ENTITY_TYPES, type DiagnosticRef, type EntityRecord, type EntityType } from '../domain';
import type { IndexSnapshot } from '../indexing';

export interface IdRegistryTypeSummary {
	type: EntityType;
	occupied: readonly string[];
	missing: readonly EntityRecord[];
	duplicateIds: readonly string[];
	formatIssues: readonly DiagnosticRef[];
	nextCandidate?: string;
}

export interface IdRegistryModel {
	byType: readonly IdRegistryTypeSummary[];
	diagnostics: readonly DiagnosticRef[];
}

export class IdRegistryQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}

	execute(): IdRegistryModel {
		const snapshot = this.snapshotProvider();
		if (!snapshot) return { byType: [], diagnostics: [] };
		const idDiagnostics = snapshot.diagnostics.filter(item => item.ruleId.startsWith('STRUCT_ID_'));
		const byType = ENTITY_TYPES.map(type => {
			const records = snapshot.records.filter(record => record.type === type);
			const occupied = records.flatMap(record => record.id ? [record.id] : []).sort();
			const missing = records.filter(record => !record.id);
			const duplicateIds = [...new Set(occupied.filter(id => (snapshot.idRegistry.byId.get(id)?.length || 0) > 1))];
			const keys = new Set(records.map(record => record.key));
			const formatIssues = idDiagnostics.filter(item => keys.has(item.entityKey) && item.ruleId !== 'STRUCT_ID_DUPLICATE');
			return { type, occupied, missing, duplicateIds, formatIssues, nextCandidate: snapshot.idRegistry.nextCandidate(type) };
		}).filter(summary => summary.occupied.length || summary.missing.length || summary.formatIssues.length || ENTITY_ID_PREFIX[summary.type]);
		return { byType, diagnostics: idDiagnostics };
	}
}
