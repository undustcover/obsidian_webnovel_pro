import type { ConsolePage } from './router';
import { CONSOLE_PAGE_GROUPS, PAGE_DEFINITIONS } from './pageRegistry';

export interface NavigationGroup { label: string; pages: readonly ConsolePage[] }

export const CONSOLE_NAVIGATION: readonly NavigationGroup[] = CONSOLE_PAGE_GROUPS.map(label => ({
	label,
	pages: Object.values(PAGE_DEFINITIONS).filter(definition => definition.group === label).map(definition => definition.page),
}));
