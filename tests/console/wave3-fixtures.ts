import type { EntityLink, EntityRecord, EntityTypeValue } from '../../src/console/domain';
import { IndexSnapshot } from '../../src/console/indexing';

export function record(type: EntityTypeValue, id: string | undefined, data: Record<string, unknown> = {}, links: string[] = []): EntityRecord {
	const key = id || `legacy:作品/${String(data.title || type)}.md#file`;
	const source = { path: `作品/${id || String(data.title || type)}.md`, mtime: 1_700_000_000_000, contentHash: `hash:${key}` };
	return {
		key, id, type, title: String(data.title || id || type), aliases: [], canon: (data.canon as EntityRecord['canon']) || 'canon',
		lifecycleStatus: (data.lifecycle_status as EntityRecord['lifecycleStatus']) || 'active', contextScope: (data.context_scope as EntityRecord['contextScope']) || 'current',
		reviewStatus: (data.review_status as EntityRecord['reviewStatus']) || 'author_confirmed', source, relatedFiles: [], data, raw: data, diagnostics: [],
		links: links.map((toRef): EntityLink => ({ type: 'related', fromKey: key, toRef, direction: 'outgoing', source })),
	};
}

export const snapshot = (...records: EntityRecord[]): IndexSnapshot => new IndexSnapshot('snapshot-v3', 'project-1', records);

export function memoryPlanningPort(initial: Record<string, string> = {}) {
	const files = new Map(Object.entries(initial).map(([path, content]) => [path, { mtime: 1, content }]));
	return { files, read: async (path: string) => files.get(path) || null };
}
