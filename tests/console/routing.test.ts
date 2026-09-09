import { describe, expect, it } from 'vitest';
import { CONSOLE_NAVIGATION } from '../../src/console/ui/navigation';
import { CONSOLE_PAGES, restoreRouterState } from '../../src/console/ui/router';

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
});
