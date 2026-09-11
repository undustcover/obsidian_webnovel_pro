import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { bindCardActivation } from '../../src/console/ui/components';
import { CONSOLE_NAVIGATION } from '../../src/console/ui/navigation';
import { PAGE_DEFINITIONS, getPageDefinition, matchesPageRecord } from '../../src/console/ui/pageRegistry';
import { CONSOLE_PAGES, pageTitle } from '../../src/console/ui/router';
import { FakeElement } from './fake-element';
import { record } from './wave3-fixtures';

const viewSource = readFileSync('src/console/ui/NovelConsoleView.ts', 'utf8');

describe('P0-090A complete route behavior matrix', () => {
	it.each(CONSOLE_PAGES)('$page has a positive contract and an explicit empty state', (page) => {
		const definition = getPageDefinition(page);
		expect(definition.page).toBe(page);
		expect(definition.title).toBe(pageTitle(page));
		expect(definition.emptyState.trim()).not.toBe('');
		expect(definition.actions.length).toBeGreaterThan(0);
		expect(CONSOLE_NAVIGATION.flatMap(group => group.pages).filter(candidate => candidate === page)).toHaveLength(1);

		if (definition.entityFilter) {
			const candidate = record(definition.entityFilter.types[0]!, `${page.toUpperCase()}-0001`);
			if (definition.entityFilter.rawTypeAliases) candidate.raw = { type: definition.entityFilter.rawTypeAliases[0] };
			expect(matchesPageRecord(definition, candidate)).toBe(true);
			expect(matchesPageRecord(definition, record('unknown', undefined, { type: 'not-this-page' }))).toBe(false);
		} else {
			expect(viewSource).toContain(`case '${definition.renderer}'`);
		}
	});

	it('dispatches every renderer and preserves query-driven result paths', () => {
		for (const renderer of new Set(Object.values(PAGE_DEFINITIONS).map(definition => definition.renderer))) {
			expect(viewSource).toContain(`case '${renderer}'`);
		}
		expect(viewSource).toContain('this.state.filters.query');
		expect(viewSource).toContain('renderGenericEntityPage(content, this.application, this.state.page, this.state.filters.query');
		expect(viewSource).toContain('renderDetails(main, record)');
	});

	it('activates result cards by click, Enter, and Space but not unrelated keys', () => {
		const card = new FakeElement();
		const activate = vi.fn();
		bindCardActivation(card as unknown as HTMLElement, activate);
		expect(card.tabIndex).toBe(0);
		expect(card.attributes.role).toBe('button');
		card.click();
		card.dispatch('keydown', { key: 'Enter' });
		card.dispatch('keydown', { key: ' ' });
		card.dispatch('keydown', { key: 'Escape' });
		expect(activate).toHaveBeenCalledTimes(3);
	});
});
