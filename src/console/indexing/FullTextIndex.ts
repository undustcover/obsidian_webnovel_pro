import type { EntityRecord, EntityTypeValue } from '../domain';

export interface EntitySearchFilters {
	types?: EntityTypeValue[];
	canon?: string[];
	lifecycle?: string[];
	contextScopes?: string[];
}

export interface EntitySearchRequest {
	query?: string;
	filters?: EntitySearchFilters;
	page?: number;
	pageSize?: number;
}

export interface EntitySearchResult {
	items: EntityRecord[];
	total: number;
	page: number;
	pageSize: number;
}

export class FullTextIndex {
	private searchable = new Map<string, string>();
	constructor(private records: readonly EntityRecord[]) {
		for (const record of records) this.searchable.set(record.key, [record.id, record.title, ...record.aliases, JSON.stringify(record.data)].filter(Boolean).join('\n').toLocaleLowerCase());
	}

	search(request: EntitySearchRequest): EntitySearchResult {
		const query = (request.query || '').trim().toLocaleLowerCase();
		const filters = request.filters || {};
		const matches = this.records.filter((record) => {
			if (query && !this.searchable.get(record.key)?.includes(query)) return false;
			if (filters.types?.length && !filters.types.includes(record.type)) return false;
			if (filters.canon?.length && !filters.canon.includes(record.canon)) return false;
			if (filters.lifecycle?.length && !filters.lifecycle.includes(record.lifecycleStatus)) return false;
			if (filters.contextScopes?.length && !filters.contextScopes.includes(record.contextScope)) return false;
			return true;
		}).sort((left, right) => left.title.localeCompare(right.title) || left.key.localeCompare(right.key));
		const pageSize = Math.max(1, Math.min(200, Math.floor(request.pageSize || 50)));
		const page = Math.max(1, Math.floor(request.page || 1));
		return { items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize };
	}
}
