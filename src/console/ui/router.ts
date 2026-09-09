export const CONSOLE_PAGES = [
	'overview',
	'control/views', 'control/current-stage', 'control/current-tasks', 'control/novel-overview',
	'control/changes', 'control/id-registry', 'control/templates',
	'narrative/book', 'narrative/parts', 'narrative/volumes', 'narrative/units', 'narrative/plans', 'narrative/chapters',
	'manuscript',
	'lore/worlds', 'lore/characters', 'lore/organizations', 'lore/locations', 'lore/items', 'lore/abilities', 'lore/terms',
	'events/control', 'events/milestones', 'events/reality', 'events/hidden', 'events/cosmic', 'events/archive',
	'materials/references', 'materials/ideas', 'context', 'health',
] as const;

export type ConsolePage = typeof CONSOLE_PAGES[number];
export type ConsoleLayout = 'wide' | 'medium' | 'narrow';

export interface ConsoleRouterState extends Record<string, unknown> {
	projectId?: string;
	page: ConsolePage;
	selectedKey?: string;
	filters: { query: string };
	detailsOpen: boolean;
}

const pageSet = new Set<string>(CONSOLE_PAGES);

export function restoreRouterState(value: unknown): ConsoleRouterState {
	const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
	const filters = raw.filters && typeof raw.filters === 'object' ? raw.filters as Record<string, unknown> : {};
	return {
		projectId: typeof raw.projectId === 'string' ? raw.projectId : undefined,
		page: typeof raw.page === 'string' && pageSet.has(raw.page) ? raw.page as ConsolePage : 'overview',
		selectedKey: typeof raw.selectedKey === 'string' ? raw.selectedKey : undefined,
		filters: { query: typeof filters.query === 'string' ? filters.query : '' },
		detailsOpen: raw.detailsOpen === true,
	};
}

export function pageTitle(page: ConsolePage): string {
	const titles: Record<ConsolePage, string> = {
		'overview': '总览', 'control/views': '视图管理', 'control/current-stage': '当前阶段',
		'control/current-tasks': '当前任务', 'control/novel-overview': '小说总览', 'control/changes': '重要变更',
		'control/id-registry': 'ID 注册表', 'control/templates': '模板', 'narrative/book': '全书',
		'narrative/parts': '分部', 'narrative/volumes': '分卷', 'narrative/units': '单元',
		'narrative/plans': '策划', 'narrative/chapters': '章节', 'manuscript': '正文',
		'lore/worlds': '世界观', 'lore/characters': '人物', 'lore/organizations': '组织',
		'lore/locations': '地点', 'lore/items': '道具', 'lore/abilities': '能力', 'lore/terms': '术语',
		'events/control': '事件总控', 'events/milestones': '里程碑', 'events/reality': '现实时间轴',
		'events/hidden': '隐藏世界', 'events/cosmic': '宇宙历史', 'events/archive': '事件归档',
		'materials/references': '参考资料', 'materials/ideas': '灵感', 'context': '上下文', 'health': '资料健康',
	};
	return titles[page];
}
