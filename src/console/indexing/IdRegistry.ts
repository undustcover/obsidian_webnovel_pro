import { ENTITY_ID_PREFIX, hasValidIdShape, type DiagnosticRef, type EntityRecord, type EntityType } from '../domain';

export class IdRegistry {
	readonly byId: ReadonlyMap<string, readonly EntityRecord[]>;
	readonly bySource: ReadonlyMap<string, string>;
	readonly diagnostics: readonly DiagnosticRef[];

	constructor(records: readonly EntityRecord[]) {
		const byId = new Map<string, EntityRecord[]>();
		const bySource = new Map<string, string>();
		const diagnostics: DiagnosticRef[] = [];
		for (const record of records) {
			if (!record.id) continue;
			const entries = byId.get(record.id) || [];
			entries.push(record);
			byId.set(record.id, entries);
			bySource.set(`${record.source.path}#${record.source.anchor || 'file'}`, record.id);
			if (record.type !== 'unknown' && ENTITY_ID_PREFIX[record.type] && !hasValidIdShape(record.type, record.id)) {
				const expectedPrefix = ENTITY_ID_PREFIX[record.type];
				diagnostics.push({
					ruleId: record.id.startsWith(`${expectedPrefix}-`) ? 'STRUCT_ID_FORMAT_NONSTANDARD' : 'STRUCT_ID_TYPE_MISMATCH',
					severity: 'warning', entityKey: record.key, message: `ID ${record.id} does not match ${record.type}.`,
					evidence: [{ path: record.source.path, anchor: record.source.anchor, field: 'id', value: record.id }],
				});
			}
		}
		for (const [id, entries] of byId) {
			if (entries.length < 2) continue;
			for (const record of entries) diagnostics.push({
				ruleId: 'STRUCT_ID_DUPLICATE', severity: 'error', entityKey: record.key, message: `Duplicate permanent ID: ${id}`,
				evidence: entries.map((entry) => ({ path: entry.source.path, anchor: entry.source.anchor, field: 'id', value: id })),
			});
		}
		this.byId = byId;
		this.bySource = bySource;
		this.diagnostics = diagnostics;
	}

	resolve(id: string): EntityRecord | undefined {
		const records = this.byId.get(id);
		return records?.length === 1 ? records[0] : undefined;
	}

	nextCandidate(type: EntityType): string | undefined {
		const prefix = ENTITY_ID_PREFIX[type];
		if (!prefix || type === 'chapter_revision') return undefined;
		let max = 0;
		for (const id of this.byId.keys()) {
			const match = id.match(new RegExp(`^${prefix}-(\\d+)$`));
			if (match) max = Math.max(max, Number(match[1]));
		}
		return `${prefix}-${String(max + 1).padStart(4, '0')}`;
	}
}
