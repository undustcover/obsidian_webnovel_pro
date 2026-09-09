import { createLegacyKey, type DiagnosticRef, type EntityRecord, type EntityType } from '../domain';
import type { AdapterSource } from './types';

export function legacyRecord(source: AdapterSource, type: EntityType, title: string, anchor: string | undefined, data: Record<string, unknown>): EntityRecord {
	const key = createLegacyKey(source.path, anchor || 'file');
	const diagnostics: DiagnosticRef[] = [{ ruleId: 'STRUCT_ID_MISSING', severity: 'warning', entityKey: key, message: 'Legacy record has no permanent ID.', evidence: [{ path: source.path, anchor }] }];
	return {
		key, type, title, aliases: [], canon: 'canon', lifecycleStatus: 'active', contextScope: 'current',
		reviewStatus: 'pending_review', source: { path: source.path, anchor, mtime: source.mtime, contentHash: source.contentHash },
		relatedFiles: [], links: [], data, raw: { ...data }, diagnostics,
	};
}
