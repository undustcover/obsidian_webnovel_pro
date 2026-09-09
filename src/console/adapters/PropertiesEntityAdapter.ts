import {
	CANON_STATUSES, CONTEXT_SCOPES, ENTITY_ID_PREFIX, ENTITY_TYPES, GOVERNANCE_DISPLAY_DEFAULTS,
	LIFECYCLE_STATUSES, REVIEW_STATUSES, createLegacyKey, normalizeEnum,
	type DiagnosticRef, type EntityRecord, type EntityType,
} from '../domain';
import { FieldResolver, toStringArray } from './fieldResolver';
import type { AdapterSource, EntityAdapter } from './types';

const TYPE_ALIASES: Readonly<Partial<Record<string, EntityType>>> = Object.freeze({
	book: 'book', '全书': 'book', part: 'part', '分部': 'part', volume: 'volume', '分卷': 'volume',
	unit: 'unit', '单元': 'unit', plan: 'plan', '策划': 'plan', chapter: 'chapter', '章节': 'chapter', '正文': 'chapter',
	chapter_revision: 'chapter_revision', character: 'character', '人物': 'character', world: 'world', '世界观': 'world',
	organization: 'organization', '组织': 'organization', location: 'location', '地点': 'location', item: 'item', '道具': 'item',
	ability: 'ability', '能力': 'ability', term: 'term', '术语': 'term', event: 'event', '事件': 'event',
	milestone: 'milestone', '里程碑': 'milestone', foreshadowing: 'foreshadowing', '伏笔': 'foreshadowing',
	mystery: 'mystery', '悬念': 'mystery', information_gap: 'information_gap', '信息差': 'information_gap',
	task: 'task', '创作任务': 'task', quality_issue: 'quality_issue', project_state: 'project_state',
	important_change: 'important_change', template: 'template', suggestion_decision_log: 'suggestion_decision_log',
});

const inferTypeFromId = (id: string): EntityType | undefined => {
	const entry = Object.entries(ENTITY_ID_PREFIX).find(([, prefix]) => id.startsWith(`${prefix}-`));
	return entry?.[0] as EntityType | undefined;
};

const firstHeading = (content: string): string | undefined => content.match(/^#\s+(.+)$/m)?.[1]?.trim();
const ID_REFERENCE = /^(?:BOOK|PART|VOL|UNIT|PLN|CH|REV-CH|WLD|CHR|ORG|LOC|ITM|ABL|TRM|EVT|MLS|FSH|MYS|INF|TSK|QA)-/;

const extractLinks = (frontmatter: Record<string, unknown>, fromKey: string, source: AdapterSource) => {
	const links = [];
	const seen = new Set<string>();
	for (const [field, raw] of Object.entries(frontmatter)) {
		if (field === 'id' || field === 'ID') continue;
		const values = Array.isArray(raw) ? raw : [raw];
		for (const value of values) {
			if (typeof value !== 'string') continue;
			const unwrapped = value.replace(/^\[\[|\]\]$/g, '').split('|')[0];
			if (!ID_REFERENCE.test(unwrapped) || seen.has(`${field}:${unwrapped}`)) continue;
			seen.add(`${field}:${unwrapped}`);
			links.push({ type: field, fromKey, toRef: unwrapped, direction: 'outgoing' as const, source: { path: source.path, mtime: source.mtime, contentHash: source.contentHash } });
		}
	}
	return links;
};

export class PropertiesEntityAdapter implements EntityAdapter {
	readonly id = 'properties-v1';
	private resolver: FieldResolver;

	constructor(projectAliases: Readonly<Record<string, readonly string[]>> = {}) {
		this.resolver = new FieldResolver(projectAliases);
	}

	canParse(source: AdapterSource): boolean {
		if (!source.frontmatter) return false;
		const type = this.resolver.resolve(source.frontmatter, 'type').value;
		const id = this.resolver.resolve(source.frontmatter, 'id').value;
		return typeof type === 'string' || typeof id === 'string';
	}

	parse(source: AdapterSource): EntityRecord[] {
		if (!source.frontmatter || !this.canParse(source)) return [];
		const fm = source.frontmatter;
		const idField = this.resolver.resolve(fm, 'id');
		const id = typeof idField.value === 'string' && idField.value.trim() ? idField.value.trim().replace(/^\[\[|\]\]$/g, '') : undefined;
		const typeField = this.resolver.resolve(fm, 'type');
		const rawType = typeof typeField.value === 'string' ? typeField.value.trim() : '';
		const type: EntityType | 'unknown' = TYPE_ALIASES[rawType] || (id ? inferTypeFromId(id) : undefined) || 'unknown';
		const key = id || createLegacyKey(source.path);
		const diagnostics: DiagnosticRef[] = [];
		if (type === 'unknown') diagnostics.push({ ruleId: 'STRUCT_ENUM_UNKNOWN', severity: 'warning', entityKey: key, message: `Unknown entity type: ${rawType || '(missing)'}`, evidence: [{ path: source.path, field: typeField.key, value: typeField.value }] });
		if (!id && type !== 'project_state' && type !== 'suggestion_decision_log') diagnostics.push({ ruleId: 'STRUCT_ID_MISSING', severity: 'warning', entityKey: key, message: 'Permanent ID is missing.', evidence: [{ path: source.path }] });

		const titleField = this.resolver.resolve(fm, 'title');
		const aliasesField = this.resolver.resolve(fm, 'aliases');
		const normalizeGovernance = <T extends string>(field: string, allowed: readonly T[], fallback: T) => {
			const resolved = this.resolver.resolve(fm, field);
			const value = normalizeEnum(resolved.value, allowed, fallback);
			if (value.value === 'unknown') diagnostics.push({ ruleId: 'STRUCT_ENUM_UNKNOWN', severity: 'warning', entityKey: key, message: `Unknown enum value for ${field}.`, evidence: [{ path: source.path, field: resolved.key, value: value.raw }] });
			const conflict = this.resolver.conflictDiagnostic(key, source.path, field, resolved);
			if (conflict) diagnostics.push(conflict);
			return value.value;
		};
		const canon = normalizeGovernance('canon', CANON_STATUSES, GOVERNANCE_DISPLAY_DEFAULTS.canon);
		const lifecycleStatus = normalizeGovernance('lifecycle_status', LIFECYCLE_STATUSES, GOVERNANCE_DISPLAY_DEFAULTS.lifecycleStatus);
		const contextScope = normalizeGovernance('context_scope', CONTEXT_SCOPES, GOVERNANCE_DISPLAY_DEFAULTS.contextScope);
		const reviewStatus = normalizeGovernance('review_status', REVIEW_STATUSES, GOVERNANCE_DISPLAY_DEFAULTS.reviewStatus);
		for (const [field, resolved] of [['id', idField], ['type', typeField], ['title', titleField], ['aliases', aliasesField]] as const) {
			const conflict = this.resolver.conflictDiagnostic(key, source.path, field, resolved);
			if (conflict) diagnostics.push(conflict);
		}
		const relatedFiles = toStringArray(this.resolver.resolve(fm, 'related_files').value);
		return [{
			key, id, type: ENTITY_TYPES.includes(type as EntityType) ? type : 'unknown',
			title: typeof titleField.value === 'string' ? titleField.value : firstHeading(source.content) || source.basename,
			aliases: toStringArray(aliasesField.value), canon, lifecycleStatus,
			contextScope, reviewStatus,
			lastReviewed: typeof this.resolver.resolve(fm, 'last_reviewed').value === 'string' ? this.resolver.resolve(fm, 'last_reviewed').value as string : undefined,
			source: { path: source.path, mtime: source.mtime, contentHash: source.contentHash }, relatedFiles,
			links: extractLinks(fm, key, source), data: { ...fm, body: source.content }, raw: { ...fm }, diagnostics,
		}];
	}
}
