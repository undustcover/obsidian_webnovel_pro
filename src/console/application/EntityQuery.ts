import type { EntitySearchRequest, EntitySearchResult, IndexSnapshot } from '../indexing';

/** Stable application boundary used by UI code instead of adapters or index internals. */
export class EntityQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}

	execute(request: EntitySearchRequest): EntitySearchResult {
		return this.snapshotProvider()?.search(request) || {
			items: [], total: 0, page: Math.max(1, Math.floor(request.page || 1)),
			pageSize: Math.max(1, Math.min(200, Math.floor(request.pageSize || 50))),
		};
	}
}
