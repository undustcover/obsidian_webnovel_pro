import { describe, expect, it, vi } from 'vitest';
import { ConsoleApplication, type Suggestion } from '../../src/console/application';
import { createDefaultConsoleProject } from '../../src/console/config';
import { MarkdownChangePlanner } from '../../src/console/persistence';
import { eventData, eventRecord } from './wave4-fixtures';
import { taskData, taskRecord } from './wave5-fixtures';
import { memoryPlanningPort, record, snapshot } from './wave3-fixtures';

function setup(initial: Record<string, string> = {}) {
	const event1 = eventRecord('EVT-0001', { eventStatus: 'occurred', timelineOrder: 1 });
	const event2 = eventRecord('EVT-0002', { eventStatus: 'occurred', timelineOrder: 2 });
	const milestone = record('milestone', 'MLS-0001', { storyline: '主线', status: 'active', completion: { mode: 'sequence', required_event_ids: ['EVT-0001', 'EVT-0002'] } });
	const task = taskRecord('TSK-0001');
	const foreshadowing = record('foreshadowing', 'FSH-0001', { status: 'planned', truth_event_ids: ['EVT-0001'], plant_before: ['EVT-0002'], advance_when: [], reveal_after: [] });
	const snap = snapshot(event1, event2, milestone, task, foreshadowing);
	const project = createDefaultConsoleProject('作品');
	const planning = memoryPlanningPort({
		[event1.source.path]: '---\ntype: event\nid: EVT-0001\ntitle: "事件一"\nevent_status: occurred\nnarrative_status: unassigned\nreader_state: unknown\nstoryline: "主线"\ntimeline_order: 1\n---\n',
		[event2.source.path]: '---\ntype: event\nid: EVT-0002\ntitle: "事件二"\nevent_status: occurred\nnarrative_status: unassigned\nreader_state: unknown\nstoryline: "主线"\ntimeline_order: 2\n---\n',
		[milestone.source.path]: '---\ntype: milestone\nid: MLS-0001\nstatus: active\n---\n',
		[task.source.path]: '---\ntype: task\nid: TSK-0001\ntitle: "任务"\ntask_kind: "写作"\nstatus: active\npriority: normal\nrelated_object_ids: []\nactivation: {"relation":"at","anchor_type":"event","anchor_id":"EVT-0001"}\nblocked_by_ids: []\n---\n任务正文\n',
		[foreshadowing.source.path]: '---\ntype: foreshadowing\nid: FSH-0001\nstatus: planned\ntruth_event_ids: ["EVT-0001"]\nplant_before: ["EVT-0002"]\nadvance_when: []\nreveal_after: []\n---\n',
		...initial,
	});
	const runtime = {
		getIndex: () => ({ getSnapshot: () => snap, getState: () => ({ status: 'idle' }) }), getProjectConfig: () => project,
		getProjectIds: () => ['project-1'], getActiveProjectId: () => 'project-1', setActiveProject: () => true,
		getConfigDiagnostics: () => [], getCacheError: () => undefined,
	};
	return { app: new ConsoleApplication(runtime as never, new MarkdownChangePlanner(planning), { execute: vi.fn() } as never, { issue: vi.fn() } as never, planning), planning, project };
}

const suggestion: Suggestion = { id: 'SUG:RULE:EVT-0001:none', ruleId: 'RULE', targetKey: 'EVT-0001', message: '处理连续性问题' };

describe('Wave 8B ConsoleApplication facade', () => {
	it('serves task, focus, cursor, suggestion, and foreshadowing read DTOs without exposing repositories', async () => {
		const { app } = setup();
		expect(app.getTask('TSK-0001')?.data.status).toBe('active');
		expect(app.getFocusCandidates().map(item => item.id)).toEqual(expect.arrayContaining(['EVT-0001', 'MLS-0001', 'TSK-0001']));
		expect(await app.getCursorLines()).toEqual([]);
		expect(Array.isArray(await app.getSuggestions())).toBe(true);
		expect(await app.getForeshadowing('FSH-0001')).toMatchObject({ writable: true, record: { id: 'FSH-0001' } });
	});

	it('creates events, updates whitelisted fields, and rejects missing targets', async () => {
		const { app } = setup();
		const created = await app.previewEventCreate({ id: 'EVT-0003', title: '新事件', data: eventData() });
		expect(created.plan.command.type).toBe('create-entity');
		expect((await app.previewEventFields('EVT-0001', { storyline: '副线', timelineOrder: 3 })).plan.fieldDiffs.map(diff => diff.field)).toEqual(expect.arrayContaining(['storyline', 'timeline_order']));
		await expect(app.previewEventFields('EVT-9999', { storyline: '副线' })).rejects.toThrow('EVENT_NOT_FOUND');
	});

	it('creates and progresses creative tasks only when anchors resolve', async () => {
		const { app } = setup();
		expect((await app.previewTaskCreate('TSK-0002', '补写', taskData())).plan.command.type).toBe('create-entity');
		expect((await app.previewTaskStatus('TSK-0001', 'completed')).plan.fieldDiffs).toContainEqual(expect.objectContaining({ field: 'status', before: 'active', after: 'completed' }));
		await expect(app.previewTaskCreate('TSK-0003', '坏锚点', taskData({ activation: { relation: 'at', anchorType: 'event', anchorId: 'EVT-9999' } }))).rejects.toThrow('TASK_ANCHOR_NOT_FOUND:EVT-9999');
	});

	it('plans all suggestion outcomes, conversion, and blocks the same repeated decision', async () => {
		const { app } = setup();
		for (const decision of ['accept', 'defer', 'ignore', 'not_applicable'] as const) expect((await app.previewSuggestionDecision({ suggestion: { ...suggestion, id: `${suggestion.id}:${decision}` }, decision })).plan.command.type).toBe('append-suggestion-decision');
		const conversion = await app.previewSuggestionDecision({ suggestion: { ...suggestion, id: `${suggestion.id}:convert` }, decision: 'convert_to_task', task: { id: 'TSK-0002', title: '转换任务', data: taskData() } });
		expect(conversion.plan.command.type).toBe('convert-suggestion-to-task');
		expect(conversion.plan.files).toHaveLength(2);

		const { app: duplicateApp, project } = setup({
			'作品/总控系统/建议决策.md': `---\ntype: suggestion_decision_log\nschema_version: 1\ndecisions: ${JSON.stringify([{ suggestionId: suggestion.id, ruleId: suggestion.ruleId, targetKey: suggestion.targetKey, decision: 'handled', decidedAt: '2026-01-01T00:00:00.000Z' }])}\n---\n`,
		});
		expect(project.directories.control).toBe('总控系统');
		await expect(duplicateApp.previewSuggestionDecision({ suggestion, decision: 'accept' })).rejects.toThrow('SUGGESTION_ALREADY_DECIDED');
	});

	it('evaluates milestones and validates every foreshadowing anchor before planning', async () => {
		const { app } = setup();
		expect(app.getMilestone('MLS-0001')).toMatchObject({ data: { completion: { mode: 'sequence' } }, evaluation: 'completion_ready' });
		expect((await app.previewMilestoneProgression('MLS-0001', 'completed')).impact.events).toEqual(expect.arrayContaining(['EVT-0001', 'EVT-0002']));
		expect((await app.previewForeshadowingUpdate('FSH-0001', { status: 'planted', advance_when: ['EVT-0002'] })).plan.command.type).toBe('update-entity-fields');
		await expect(app.previewForeshadowingUpdate('FSH-0001', { reveal_after: ['EVT-9999'] })).rejects.toThrow('FORESHADOWING_ANCHOR_NOT_FOUND:EVT-9999');
	});

	it('rejects a focus that is not a resolvable entity before touching project state', async () => {
		const { app } = setup();
		await expect(app.previewProjectState({ currentFocus: 'CH-9999', storylineCursors: {} })).rejects.toThrow('CURRENT_FOCUS_NOT_FOUND');
	});

	it('previews clearing focus without discarding configured cursors', async () => {
		const path = '作品/总控系统/当前阶段.md';
		const { app } = setup({ [path]: '---\nschema_version: 1\ncurrent_focus: EVT-0001\nstoryline_cursors:\n  "主线": EVT-0002\n---\n' });
		const preview = await app.previewProjectState({ currentFocus: null, storylineCursors: { 主线: 'EVT-0002' } });
		expect(preview.plan.files[0]?.content).toContain('current_focus: null');
		expect(preview.plan.files[0]?.content).toContain('"主线": EVT-0002');
	});
});
