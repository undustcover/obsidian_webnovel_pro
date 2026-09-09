import type { DiagnosticRef } from './diagnostics';
import type { EntityLink } from './relations';

export const ENTITY_TYPES = [
	'book', 'part', 'volume', 'unit', 'plan', 'chapter', 'chapter_revision',
	'world', 'character', 'organization', 'location', 'item', 'ability', 'term',
	'event', 'milestone', 'foreshadowing', 'mystery', 'information_gap', 'task',
	'quality_issue', 'important_change', 'template', 'project_state', 'suggestion_decision_log',
] as const;

export type EntityType = typeof ENTITY_TYPES[number];
export type EntityTypeValue = EntityType | 'unknown';

export const CANON_STATUSES = ['canon', 'candidate', 'conflict'] as const;
export type CanonStatus = typeof CANON_STATUSES[number];
export const LIFECYCLE_STATUSES = ['active', 'deprecated', 'archived'] as const;
export type LifecycleStatus = typeof LIFECYCLE_STATUSES[number];
export const CONTEXT_SCOPES = ['current', 'history', 'test', 'draft'] as const;
export type ContextScope = typeof CONTEXT_SCOPES[number];
export const REVIEW_STATUSES = ['author_confirmed', 'pending_review'] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export interface SourceLocation {
	path: string;
	anchor?: string;
	mtime: number;
	contentHash: string;
}

export interface EntityRecord<TData = Record<string, unknown>> {
	key: string;
	id?: string;
	type: EntityTypeValue;
	title: string;
	aliases: string[];
	canon: CanonStatus | 'unknown';
	lifecycleStatus: LifecycleStatus | 'unknown';
	contextScope: ContextScope | 'unknown';
	reviewStatus: ReviewStatus | 'unknown';
	lastReviewed?: string;
	source: SourceLocation;
	relatedFiles: string[];
	links: EntityLink[];
	data: TData;
	raw: Record<string, unknown>;
	diagnostics: DiagnosticRef[];
}

export interface GovernanceDefaults {
	canon: CanonStatus;
	lifecycleStatus: LifecycleStatus;
	contextScope: ContextScope;
	reviewStatus: ReviewStatus;
}

export const GOVERNANCE_DISPLAY_DEFAULTS: Readonly<GovernanceDefaults> = Object.freeze({
	canon: 'canon',
	lifecycleStatus: 'active',
	contextScope: 'current',
	reviewStatus: 'pending_review',
});

export const ENTITY_ID_PREFIX: Readonly<Partial<Record<EntityType, string>>> = Object.freeze({
	book: 'BOOK', part: 'PART', volume: 'VOL', unit: 'UNIT', plan: 'PLN', chapter: 'CH',
	chapter_revision: 'REV-CH', world: 'WLD', character: 'CHR', organization: 'ORG',
	location: 'LOC', item: 'ITM', ability: 'ABL', term: 'TRM', event: 'EVT', milestone: 'MLS',
	foreshadowing: 'FSH', mystery: 'MYS', information_gap: 'INF', task: 'TSK', quality_issue: 'QA',
});

export function createLegacyKey(path: string, anchor = 'file'): string {
	const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
	return `legacy:${normalizedPath}#${anchor || 'file'}`;
}

export function hasValidIdShape(type: EntityType, id: string): boolean {
	const prefix = ENTITY_ID_PREFIX[type];
	if (!prefix) return false;
	if (type === 'chapter_revision') return /^REV-CH-\d{4,}-\d{2,}$/.test(id);
	return new RegExp(`^${prefix}-\\d{4,}$`).test(id);
}
