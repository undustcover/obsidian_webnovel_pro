import { describe, expect, it, vi } from 'vitest';
import { ConsoleApplication } from '../../src/console/application';
import type { ChangePlan } from '../../src/console/domain';
import { createDefaultConsoleProject } from '../../src/console/config';
import { MarkdownChangePlanner } from '../../src/console/persistence';
import { memoryPlanningPort, record, snapshot as makeSnapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

describe('ConsoleApplication facade', () => {
	it('exposes projects, index status/search, preview, confirmation, and execution through one boundary', async () => {
		const searchResult = { items: [], total: 0, page: 1, pageSize: 20 };
		const snapshot = { version: 's1', records: [], search: vi.fn().mockReturnValue(searchResult) };
		const index = { getState: vi.fn().mockReturnValue({ status: 'idle', snapshotVersion: 's1' }), getSnapshot: vi.fn().mockReturnValue(snapshot) };
		const runtime = {
			getProjectIds: vi.fn().mockReturnValue(['p1']), getActiveProjectId: vi.fn().mockReturnValue('p1'),
			setActiveProject: vi.fn().mockReturnValue(true), getIndex: vi.fn().mockReturnValue(index), getConfigDiagnostics: vi.fn().mockReturnValue([]), getCacheError: vi.fn(),
		};
		const planned = { planId: 'PLAN-1', requiresConfirmation: true } as ChangePlan;
		const planner = { plan: vi.fn().mockResolvedValue(planned) };
		const executor = { execute: vi.fn().mockResolvedValue({ status: 'succeeded' }) };
		const tokens = { issue: vi.fn().mockReturnValue('token') };
		const app = new ConsoleApplication(runtime as never, planner as never, executor as never, tokens as never);
		expect(app.getProjectIds()).toEqual(['p1']);
		expect(app.getActiveProjectId()).toBe('p1');
		expect(app.setActiveProject('p1')).toBe(true);
		expect(app.getIndexState()).toMatchObject({ status: 'ready', recordCount: 0 });
		expect(app.search({ query: 'x', page: 1, pageSize: 20 })).toBe(searchResult);
		const command = { type: 'advance-event', actor: 'author' as const, requestedAt: new Date().toISOString(), targetKeys: [], payload: { mutations: [{ path: 'a.md', operation: 'create' as const, content: 'x' }] } };
		expect((await app.preview(command)).impact.planId).toBe('PLAN-1');
		expect(app.confirm(planned)).toBe('token');
		await app.execute(planned, 'token');
		expect(executor.execute).toHaveBeenCalledWith(planned, 'token');
	});

	it('provides explicit unavailable empty states and refuses preview without a snapshot', async () => {
		const runtime = { getIndex: vi.fn(), getProjectIds: vi.fn().mockReturnValue([]), getActiveProjectId: vi.fn(), setActiveProject: vi.fn(), getConfigDiagnostics: vi.fn().mockReturnValue([]), getCacheError: vi.fn() };
		const app = new ConsoleApplication(runtime as never, { plan: vi.fn() } as never, { execute: vi.fn() } as never, { issue: vi.fn() } as never);
		expect(app.getIndexState()).toMatchObject({ status: 'unconfigured', suggestedActions: ['configure'] });
		expect(app.search({ query: '', page: 0, pageSize: 0 })).toMatchObject({ items: [], page: 1, pageSize: 1 });
		await expect(app.preview({ type: 'x', actor: 'author', requestedAt: '', targetKeys: [], payload: { mutations: [] } })).rejects.toThrow('no published snapshot');
		expect(() => app.confirm({ requiresConfirmation: false } as ChangePlan)).toThrow('only issued');
	});

	it.each([
		['invalid configuration', { projectIds: [], diagnostics: [{ code: 'CONFIG_INVALID_PROJECT', severity: 'error', index: 0, message: 'bad config' }], state: undefined, snapshot: undefined }, { status: 'error', code: 'CONSOLE_CONFIG_INVALID' }],
		['active scan', { projectIds: ['p1'], diagnostics: [], state: { status: 'indexing', processed: 2, total: 5 }, snapshot: undefined }, { status: 'initializing', processed: 2, total: 5 }],
		['waiting for first snapshot', { projectIds: ['p1'], diagnostics: [], state: { status: 'idle' }, snapshot: undefined }, { status: 'initializing', processed: 0, total: 0 }],
		['partial scan', { projectIds: ['p1'], diagnostics: [], state: { status: 'degraded', snapshotVersion: 's1', failedPaths: ['bad.md'] }, snapshot: { version: 's1', records: [] } }, { status: 'degraded', failedPaths: ['bad.md'], recordCount: 0 }],
		['scan failure', { projectIds: ['p1'], diagnostics: [], state: { status: 'error', message: 'disk failed' }, snapshot: undefined }, { status: 'error', code: 'INDEX_SCAN_FAILED', technicalDetail: 'disk failed' }],
	] as const)('maps %s to the shared availability contract', (_label, input, expected) => {
		const index = input.state ? { getState: () => input.state, getSnapshot: () => input.snapshot } : undefined;
		const runtime = {
			getProjectIds: () => [...input.projectIds],
			getActiveProjectId: () => input.projectIds[0],
			getIndex: () => index,
			getConfigDiagnostics: () => [...input.diagnostics],
			getCacheError: () => undefined,
			setActiveProject: () => true,
		};
		const app = new ConsoleApplication(runtime as never, { plan: vi.fn() } as never, { execute: vi.fn() } as never, { issue: vi.fn() } as never);
		expect(app.getIndexState()).toMatchObject(expected);
	});

	it('orchestrates all Wave 3 read models and persistence previews through the facade', async () => {
		const chapter = record('chapter', 'CH-0001', { title: '第一章', chapter_no: 1 });
		const event = eventRecord('EVT-0001', { storyTime: { display: '第一日', precision: 'day' }, timelineViews: { reality: { visible: true, importance: 'normal' }, characters: {}, organizations: {} } });
		const milestone = record('milestone', 'MLS-0001', { status: 'active' });
		const snapshot = makeSnapshot(chapter, event, milestone);
		const project = createDefaultConsoleProject('作品');
		const runtime = {
			getIndex: vi.fn().mockReturnValue({ getSnapshot: () => snapshot, getState: () => ({ status: 'idle' }) }),
			getProjectConfig: vi.fn().mockReturnValue(project), getProjectIds: () => ['project-1'], getActiveProjectId: () => 'project-1', setActiveProject: () => true,
			getConfigDiagnostics: () => [], getCacheError: () => undefined,
		};
		const planning = memoryPlanningPort({
			[chapter.source.path]: '---\ntitle: 第一章\n---\n正文',
			[event.source.path]: '---\ntype: event\nid: EVT-0001\n---\n',
			[milestone.source.path]: '---\ntype: milestone\nid: MLS-0001\nstatus: active\n---\n',
		});
		const planner = new MarkdownChangePlanner(planning);
		const app = new ConsoleApplication(runtime as never, planner, { execute: vi.fn() } as never, { issue: vi.fn() } as never, planning);
		expect(app.getNarrativeTree().roots[0]?.key).toBe('CH-0001');
		expect(app.getManuscript()).toHaveLength(1);
		expect(app.getChapterWorkspace('CH-0001').chapter).toBe(chapter);
		const context = app.planContext({ target: { kind: 'chapter', key: 'CH-0001' }, now: new Date('2026-01-01T00:00:00Z') });
		expect((await app.getDashboard()).configured).toBe(false);
		expect((await app.previewProjectState({ currentFocus: 'CH-0001', storylineCursors: {} })).plan.files[0]?.operation).toBe('create');
		expect((await app.previewChapterUpdate('CH-0001', { title: '新标题' })).plan.command.type).toBe('update-entity-fields');
		expect((await app.previewContextOutput(context)).plan.files).toHaveLength(2);
		expect(app.getEvent('EVT-0001')?.data.storyline).toBe('主线');
		expect(app.getTimeline('reality').items).toHaveLength(1);
		expect((await app.previewTimelineImportance('EVT-0001', 'reality', 'major')).plan.fieldDiffs).toHaveLength(1);
		expect((await app.previewEventProgression('EVT-0001', 'occurred')).impact.events).toContain('EVT-0001');
		expect((await app.previewNarrativeProgression('EVT-0001', 'outlined')).plan.command.type).toBe('update-narrative-status');
		expect((await app.previewReaderProgression('EVT-0001', 'revealed')).plan.command.type).toBe('update-reader-state');
		planning.files.set('作品/总控系统/当前阶段.md', { mtime: 1, content: '---\nschema_version: 1\ncurrent_focus: CH-0001\nstoryline_cursors:\n  "主线": EVT-0001\n---\n' });
		expect((await app.previewCursorProgression('主线', 'EVT-0001')).plan.command.type).toBe('update-storyline-cursor');
		expect((await app.previewMilestoneProgression('MLS-0001', 'completed')).plan.command.type).toBe('complete-milestone');
	});
});
