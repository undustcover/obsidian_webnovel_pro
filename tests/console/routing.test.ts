import { describe, expect, it } from 'vitest';
import { CONSOLE_NAVIGATION } from '../../src/console/ui/navigation';
import { CONSOLE_PAGES, pageTitle, restoreRouterState } from '../../src/console/ui/router';
import { PAGE_DEFINITIONS, getPageDefinition, matchesPageRecord, validatePageRegistry } from '../../src/console/ui/pageRegistry';
import { record } from './wave3-fixtures';

describe('Console routing', () => {
	it('keeps every P0 route reachable with narrative and manuscript separated', () => {
		const reachable = new Set(CONSOLE_NAVIGATION.flatMap(group => group.pages));
		for (const page of CONSOLE_PAGES) expect(reachable.has(page)).toBe(true);
		expect(reachable.has('narrative/chapters')).toBe(true);
		expect(reachable.has('manuscript')).toBe(true);
	});

	it('restores only UI state and rejects unknown pages', () => {
		expect(restoreRouterState({ page: 'bad', filters: { query: '林澈' }, selectedKey: 'CHR-0001', detailsOpen: true })).toEqual({
			page: 'overview', filters: { query: '林澈' }, selectedKey: 'CHR-0001', detailsOpen: true, projectId: undefined,
		});
	});

	it('restores the persisted project id with the rest of the view state', () => {
		expect(restoreRouterState({ projectId: 'p2', page: 'overview' }).projectId).toBe('p2');
	});

	it('has one declarative definition and one navigation owner for every route', () => {
		expect(validatePageRegistry()).toBe(true);
		expect(Object.keys(PAGE_DEFINITIONS).sort()).toEqual([...CONSOLE_PAGES].sort());
		const navigationPages = CONSOLE_NAVIGATION.flatMap(group => group.pages);
		expect(navigationPages).toHaveLength(CONSOLE_PAGES.length);
		for (const page of CONSOLE_PAGES) {
			expect(navigationPages.filter(candidate => candidate === page)).toHaveLength(1);
			expect(getPageDefinition(page).title).toBe(pageTitle(page));
		}
	});

	it('declares exact lore and compatibility-only material filters with specific empty states', () => {
		expect(getPageDefinition('lore/characters').entityFilter?.types).toEqual(['character']);
		expect(getPageDefinition('lore/items').entityFilter?.types).toEqual(['item']);
		const reference = record('unknown', undefined, { type: '参考资料', title: '资料' });
		const idea = record('unknown', undefined, { type: 'idea', title: '灵感' });
		reference.raw = { type: '参考资料' };
		idea.raw = { type: 'idea' };
		expect(matchesPageRecord(getPageDefinition('materials/references'), reference)).toBe(true);
		expect(matchesPageRecord(getPageDefinition('materials/references'), idea)).toBe(false);
		for (const page of CONSOLE_PAGES) expect(getPageDefinition(page).emptyState.trim()).not.toBe('');
	});
});
