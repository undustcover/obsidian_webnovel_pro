import type { ConsolePage } from './router';

export interface NavigationGroup { label: string; pages: readonly ConsolePage[] }

export const CONSOLE_NAVIGATION: readonly NavigationGroup[] = [
	{ label: '创作', pages: ['overview', 'manuscript', 'context', 'health'] },
	{ label: '总控', pages: ['control/views', 'control/current-stage', 'control/current-tasks', 'control/novel-overview', 'control/changes', 'control/id-registry', 'control/templates'] },
	{ label: '叙事', pages: ['narrative/book', 'narrative/parts', 'narrative/volumes', 'narrative/units', 'narrative/plans', 'narrative/chapters'] },
	{ label: '设定', pages: ['lore/worlds', 'lore/characters', 'lore/organizations', 'lore/locations', 'lore/items', 'lore/abilities', 'lore/terms'] },
	{ label: '事件', pages: ['events/control', 'events/milestones', 'events/reality', 'events/hidden', 'events/cosmic', 'events/archive'] },
	{ label: '素材', pages: ['materials/references', 'materials/ideas'] },
];
