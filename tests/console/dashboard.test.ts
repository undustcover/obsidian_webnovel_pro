import { describe, expect, it } from 'vitest';
import { DashboardQuery } from '../../src/console/application';
import { DASHBOARD_ACTION_SECTIONS, renderDashboardPage } from '../../src/console/ui';
import { record, snapshot } from './wave3-fixtures';
import { FakeElement } from './fake-element';

describe('DashboardQuery/Page', () => {
	it('shows configured focus, cursor order, chapter aggregate, health and action placeholders', () => {
		const model = new DashboardQuery(() => undefined).execute(null);
		expect(model.configured).toBe(false);
		expect(model).toMatchObject({ indexStatus: 'error', healthCount: 0, actionGroups: { now: [], missed: [], upcoming: [], later: [] } });
	});

	it('renders configured and empty states in stable action order', () => {
		const chapter = record('chapter', 'CH-0001', { title: '第一章' });
		const model = new DashboardQuery(() => snapshot(chapter)).execute({ schemaVersion: 1, currentFocus: 'CH-0001', storylineCursors: { 主线: 'EVT-0001' } });
		expect(model.chapterWorkspace?.chapter).toBe(chapter);
		const root = new FakeElement();
		renderDashboardPage(root as unknown as HTMLElement, model);
		expect(DASHBOARD_ACTION_SECTIONS.map(([, title]) => title)).toEqual(['现在', '遗漏', '即将', '稍后']);
		expect(root.textContent).toContain('主线：EVT-0001');
	});
});
