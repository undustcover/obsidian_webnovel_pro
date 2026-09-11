import type { EntityRecord, EntityTypeValue } from '../domain';
import { CONSOLE_PAGES, type ConsolePage } from './router';

export const CONSOLE_PAGE_GROUPS = ['创作', '总控', '叙事', '设定', '事件', '素材'] as const;
export type ConsolePageGroup = typeof CONSOLE_PAGE_GROUPS[number];

export type PageRendererId =
	| 'dashboard' | 'views' | 'current-stage' | 'current-tasks' | 'novel-overview'
	| 'changes' | 'id-registry' | 'templates' | 'narrative' | 'manuscript'
	| 'entity-list' | 'event-control' | 'milestones' | 'timeline' | 'context' | 'health';

export type PageAction = 'open-source' | 'open-immersive' | 'create-chapter' | 'inspect';

export interface PageEntityFilter {
	readonly types: readonly EntityTypeValue[];
	/** Compatibility-only discriminator for schema-unknown material records. */
	readonly rawTypeAliases?: readonly string[];
}

export interface PageDefinition {
	readonly page: ConsolePage;
	readonly title: string;
	readonly group: ConsolePageGroup;
	readonly renderer: PageRendererId;
	readonly entityFilter?: PageEntityFilter;
	readonly actions: readonly PageAction[];
	readonly emptyState: string;
}

const define = <T extends Record<ConsolePage, PageDefinition>>(definitions: T): T => definitions;

export const PAGE_DEFINITIONS = define({
	'overview': { page: 'overview', title: '总览', group: '创作', renderer: 'dashboard', actions: ['inspect'], emptyState: '暂无总览数据。' },
	'control/views': { page: 'control/views', title: '视图管理', group: '总控', renderer: 'views', actions: ['inspect'], emptyState: '暂无可用视图。' },
	'control/current-stage': { page: 'control/current-stage', title: '当前阶段', group: '总控', renderer: 'current-stage', entityFilter: { types: ['project_state'] }, actions: ['open-source'], emptyState: '尚未创建当前阶段。' },
	'control/current-tasks': { page: 'control/current-tasks', title: '当前任务', group: '总控', renderer: 'current-tasks', entityFilter: { types: ['task'] }, actions: ['open-source'], emptyState: '暂无当前任务。' },
	'control/novel-overview': { page: 'control/novel-overview', title: '小说总览', group: '总控', renderer: 'novel-overview', actions: ['inspect'], emptyState: '暂无小说总览数据。' },
	'control/changes': { page: 'control/changes', title: '重要变更', group: '总控', renderer: 'changes', entityFilter: { types: ['important_change'] }, actions: ['inspect'], emptyState: '暂无重要变更记录。' },
	'control/id-registry': { page: 'control/id-registry', title: 'ID 注册表', group: '总控', renderer: 'id-registry', actions: ['inspect'], emptyState: '当前项目没有可登记实体。' },
	'control/templates': { page: 'control/templates', title: '模板', group: '总控', renderer: 'templates', entityFilter: { types: ['template'] }, actions: ['open-source', 'create-chapter'], emptyState: '暂无有效模板。' },
	'narrative/book': { page: 'narrative/book', title: '全书', group: '叙事', renderer: 'narrative', entityFilter: { types: ['book'] }, actions: ['open-source'], emptyState: '暂无全书规划。' },
	'narrative/parts': { page: 'narrative/parts', title: '分部', group: '叙事', renderer: 'narrative', entityFilter: { types: ['part'] }, actions: ['open-source'], emptyState: '暂无分部。' },
	'narrative/volumes': { page: 'narrative/volumes', title: '分卷', group: '叙事', renderer: 'narrative', entityFilter: { types: ['volume'] }, actions: ['open-source'], emptyState: '暂无分卷。' },
	'narrative/units': { page: 'narrative/units', title: '单元', group: '叙事', renderer: 'narrative', entityFilter: { types: ['unit'] }, actions: ['open-source'], emptyState: '暂无单元。' },
	'narrative/plans': { page: 'narrative/plans', title: '策划', group: '叙事', renderer: 'narrative', entityFilter: { types: ['plan'] }, actions: ['open-source'], emptyState: '暂无策划。' },
	'narrative/chapters': { page: 'narrative/chapters', title: '章节', group: '叙事', renderer: 'narrative', entityFilter: { types: ['chapter'] }, actions: ['open-source'], emptyState: '暂无章节结构。' },
	'manuscript': { page: 'manuscript', title: '正文', group: '创作', renderer: 'manuscript', entityFilter: { types: ['chapter'] }, actions: ['open-source', 'open-immersive'], emptyState: '暂无正文。' },
	'lore/worlds': { page: 'lore/worlds', title: '世界观', group: '设定', renderer: 'entity-list', entityFilter: { types: ['world'] }, actions: ['open-source'], emptyState: '暂无世界观资料。' },
	'lore/characters': { page: 'lore/characters', title: '人物', group: '设定', renderer: 'entity-list', entityFilter: { types: ['character'] }, actions: ['open-source'], emptyState: '暂无人物资料。' },
	'lore/organizations': { page: 'lore/organizations', title: '组织', group: '设定', renderer: 'entity-list', entityFilter: { types: ['organization'] }, actions: ['open-source'], emptyState: '暂无组织资料。' },
	'lore/locations': { page: 'lore/locations', title: '地点', group: '设定', renderer: 'entity-list', entityFilter: { types: ['location'] }, actions: ['open-source'], emptyState: '暂无地点资料。' },
	'lore/items': { page: 'lore/items', title: '道具', group: '设定', renderer: 'entity-list', entityFilter: { types: ['item'] }, actions: ['open-source'], emptyState: '暂无道具资料。' },
	'lore/abilities': { page: 'lore/abilities', title: '能力', group: '设定', renderer: 'entity-list', entityFilter: { types: ['ability'] }, actions: ['open-source'], emptyState: '暂无能力资料。' },
	'lore/terms': { page: 'lore/terms', title: '术语', group: '设定', renderer: 'entity-list', entityFilter: { types: ['term'] }, actions: ['open-source'], emptyState: '暂无术语资料。' },
	'events/control': { page: 'events/control', title: '事件总控', group: '事件', renderer: 'event-control', entityFilter: { types: ['event'] }, actions: ['open-source'], emptyState: '暂无事件。' },
	'events/milestones': { page: 'events/milestones', title: '里程碑', group: '事件', renderer: 'milestones', entityFilter: { types: ['milestone'] }, actions: ['open-source'], emptyState: '暂无里程碑。' },
	'events/reality': { page: 'events/reality', title: '现实时间轴', group: '事件', renderer: 'timeline', entityFilter: { types: ['event'] }, actions: ['open-source'], emptyState: '现实时间轴暂无事件。' },
	'events/hidden': { page: 'events/hidden', title: '隐藏世界', group: '事件', renderer: 'timeline', entityFilter: { types: ['event'] }, actions: ['open-source'], emptyState: '隐藏世界暂无事件。' },
	'events/cosmic': { page: 'events/cosmic', title: '宇宙历史', group: '事件', renderer: 'timeline', entityFilter: { types: ['event'] }, actions: ['open-source'], emptyState: '宇宙历史暂无事件。' },
	'events/archive': { page: 'events/archive', title: '事件归档', group: '事件', renderer: 'timeline', entityFilter: { types: ['event'] }, actions: ['open-source'], emptyState: '暂无归档事件。' },
	'materials/references': { page: 'materials/references', title: '参考资料', group: '素材', renderer: 'entity-list', entityFilter: { types: ['unknown'], rawTypeAliases: ['reference', '参考资料'] }, actions: ['open-source'], emptyState: '暂无参考资料；本页为只读索引。' },
	'materials/ideas': { page: 'materials/ideas', title: '灵感', group: '素材', renderer: 'entity-list', entityFilter: { types: ['unknown'], rawTypeAliases: ['idea', '灵感'] }, actions: ['open-source'], emptyState: '暂无灵感；本页为只读索引。' },
	'context': { page: 'context', title: '上下文', group: '创作', renderer: 'context', actions: ['inspect'], emptyState: '请选择上下文目标。' },
	'health': { page: 'health', title: '资料健康', group: '创作', renderer: 'health', actions: ['inspect'], emptyState: '未发现资料健康问题。' },
} satisfies Record<ConsolePage, PageDefinition>);

export function getPageDefinition(page: ConsolePage): PageDefinition { return PAGE_DEFINITIONS[page]; }

export function matchesPageRecord(definition: PageDefinition, record: EntityRecord): boolean {
	const filter = definition.entityFilter;
	if (!filter || !filter.types.includes(record.type)) return false;
	if (!filter.rawTypeAliases?.length) return true;
	const rawType = typeof record.raw.type === 'string' ? record.raw.type.trim().toLocaleLowerCase() : '';
	return filter.rawTypeAliases.some(alias => alias.toLocaleLowerCase() === rawType);
}

export function validatePageRegistry(): boolean {
	return CONSOLE_PAGES.every(page => PAGE_DEFINITIONS[page]?.page === page);
}
