import { describe, expect, it, vi } from 'vitest';
import { ConsoleApplication } from '../../src/console/application';
import type { ChangePlan } from '../../src/console/domain';
import { createDefaultConsoleProject } from '../../src/console/config';
import { MarkdownChangePlanner } from '../../src/console/persistence';
import { memoryPlanningPort, record, snapshot as makeSnapshot } from './wave3-fixtures';

describe('ConsoleApplication facade', () => {
	it('exposes projects, index status/search, preview, confirmation, and execution through one boundary', async () => {
		const searchResult = { items: [], total: 0, page: 1, pageSize: 20 };
		const snapshot = { version: 's1', search: vi.fn().mockReturnValue(searchResult) };
		const index = { getState: vi.fn().mockReturnValue({ status: 'idle', snapshotVersion: 's1' }), getSnapshot: vi.fn().mockReturnValue(snapshot) };
		const runtime = {
			getProjectIds: vi.fn().mockReturnValue(['p1']), getActiveProjectId: vi.fn().mockReturnValue('p1'),
			setActiveProject: vi.fn().mockReturnValue(true), getIndex: vi.fn().mockReturnValue(index),
		};
		const planned = { planId: 'PLAN-1', requiresConfirmation: true } as ChangePlan;
		const planner = { plan: vi.fn().mockResolvedValue(planned) };
		const executor = { execute: vi.fn().mockResolvedValue({ status: 'succeeded' }) };
		const tokens = { issue: vi.fn().mockReturnValue('token') };
		const app = new ConsoleApplication(runtime as never, planner as never, executor as never, tokens as never);
		expect(app.getProjectIds()).toEqual(['p1']);
		expect(app.getActiveProjectId()).toBe('p1');
		expect(app.setActiveProject('p1')).toBe(true);
		expect(app.getIndexState()).toMatchObject({ status: 'idle' });
		expect(app.search({ query: 'x', page: 1, pageSize: 20 })).toBe(searchResult);
		const command = { type: 'advance-event', actor: 'author' as const, requestedAt: new Date().toISOString(), targetKeys: [], payload: { mutations: [{ path: 'a.md', operation: 'create' as const, content: 'x' }] } };
		expect((await app.preview(command)).impact.planId).toBe('PLAN-1');
		expect(app.confirm(planned)).toBe('token');
		await app.execute(planned, 'token');
		expect(executor.execute).toHaveBeenCalledWith(planned, 'token');
	});

	it('provides explicit unavailable empty states and refuses preview without a snapshot', async () => {
		const runtime = { getIndex: vi.fn(), getProjectIds: vi.fn().mockReturnValue([]), getActiveProjectId: vi.fn(), setActiveProject: vi.fn() };
		const app = new ConsoleApplication(runtime as never, { plan: vi.fn() } as never, { execute: vi.fn() } as never, { issue: vi.fn() } as never);
		expect(app.getIndexState()).toMatchObject({ status: 'error' });
		expect(app.search({ query: '', page: 0, pageSize: 0 })).toMatchObject({ items: [], page: 1, pageSize: 1 });
		await expect(app.preview({ type: 'x', actor: 'author', requestedAt: '', targetKeys: [], payload: { mutations: [] } })).rejects.toThrow('no published snapshot');
		expect(() => app.confirm({ requiresConfirmation: false } as ChangePlan)).toThrow('only issued');
	});

	it('orchestrates all Wave 3 read models and persistence previews through the facade', async () => {
		const chapter = record('chapter', 'CH-0001', { title: '第一章', chapter_no: 1 });
		const snapshot = makeSnapshot(chapter);
		const project = createDefaultConsoleProject('作品');
		const runtime = {
			getIndex: vi.fn().mockReturnValue({ getSnapshot: () => snapshot, getState: () => ({ status: 'idle' }) }),
			getProjectConfig: vi.fn().mockReturnValue(project), getProjectIds: () => ['project-1'], getActiveProjectId: () => 'project-1', setActiveProject: () => true,
		};
		const planning = memoryPlanningPort({ [chapter.source.path]: '---\ntitle: 第一章\n---\n正文' });
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
	});
});
