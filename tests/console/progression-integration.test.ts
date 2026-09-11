import { describe, expect, it, vi } from 'vitest';
import { createDefaultConsoleProject } from '../../src/console/config';
import { ProgressionCommandService } from '../../src/console/application';
import { EventRepository, MarkdownChangePlanner, ProjectStateRepository, ConfirmationTokenService, TransactionExecutor, type TransactionPort } from '../../src/console/persistence';
import { memoryPlanningPort, record, snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

class WritePort implements TransactionPort {
	constructor(readonly files: Map<string, { mtime: number; content: string }>) {}
	writes = 0;
	async read(path: string) { return this.files.get(path) || null; }
	async create(path: string, content: string) { this.writes++; this.files.set(path, { mtime: 2, content }); }
	async modify(path: string, content: string) { this.writes++; this.files.set(path, { mtime: 2, content }); }
	async delete(path: string) { this.writes++; this.files.delete(path); }
	async move(path: string, target: string) { this.writes++; this.files.set(target, this.files.get(path)!); this.files.delete(path); }
}

describe('author-confirmed progression', () => {
	it('previews event, cursor, and milestone with zero writes, then requires a plan-bound token', async () => {
		const event = eventRecord('EVT-0001', { storyTime: { display: '第一日', precision: 'day' } });
		const crossline = eventRecord('EVT-0002', { storyline: '支线' });
		const milestone = record('milestone', 'MLS-0001', { title: '第一幕', status: 'active' });
		const project = createDefaultConsoleProject('作品'); const statePath = '作品/总控系统/当前阶段.md';
		const contents: Record<string, string> = { [event.source.path]: '---\ntype: event\nid: EVT-0001\nevent_status: planned\n---\n', [milestone.source.path]: '---\ntype: milestone\nid: MLS-0001\nstatus: active\n---\n', [statePath]: '---\nschema_version: 1\ncurrent_focus: CH-0001\nstoryline_cursors:\n  "主线": EVT-0001\n---\n' };
		const planning = memoryPlanningPort(contents); const planner = new MarkdownChangePlanner(planning); const snap = snapshot(event, crossline, milestone);
		const service = new ProgressionCommandService(() => snap, new EventRepository(() => snap, project, planning, planner), new ProjectStateRepository(project, planning, planner), planning, planner);
		const eventPreview = await service.previewEventStatus('EVT-0001', 'occurred', '2026-01-01T00:00:00.000Z');
		const narrativePreview = await service.previewNarrativeStatus('EVT-0001', 'outlined', '2026-01-01T00:00:00.000Z');
		const readerPreview = await service.previewReaderState('EVT-0001', 'revealed', '2026-01-01T00:00:00.000Z');
		const cursorPreview = await service.previewCursor('主线', 'EVT-0001', '2026-01-01T00:00:00.000Z');
		const milestonePreview = await service.previewMilestoneStatus('MLS-0001', 'completed', '2026-01-01T00:00:00.000Z');
		const undoPreview = await service.previewCursorUndo('主线', 'EVT-0001', '2026-01-01T00:00:00.000Z');
		await expect(service.previewCursor('主线', 'EVT-0002')).rejects.toThrow('CURSOR_STORYLINE_MISMATCH');
		await expect(service.previewMilestoneStatus('MLS-0001', 'planned')).rejects.toThrow('MILESTONE_TRANSITION_NOT_ALLOWED');
		expect([eventPreview, narrativePreview, readerPreview, cursorPreview, milestonePreview].every(preview => preview.plan.requiresConfirmation && preview.impact.planId === preview.plan.planId)).toBe(true);
		expect(undoPreview.plan.warnings[0]).toContain('不会回滚事件');
		const writePort = new WritePort(new Map([...planning.files.entries()].map(([path, file]) => [path, { ...file }]))); const tokens = new ConfirmationTokenService(); const executor = new TransactionExecutor(writePort, { waitForRefresh: vi.fn().mockResolvedValue('snapshot-v4') }, tokens);
		expect(writePort.writes).toBe(0);
		await expect(executor.execute(eventPreview.plan)).rejects.toThrow('confirmation token');
		expect(writePort.writes).toBe(0);
		expect((await executor.execute(eventPreview.plan, tokens.issue(eventPreview.plan.planId))).status).toBe('succeeded');
		expect(writePort.writes).toBe(1);
	});
});
