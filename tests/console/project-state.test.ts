import { describe, expect, it } from 'vitest';
import { createDefaultConsoleProject } from '../../src/console/config';
import { MarkdownChangePlanner, ProjectStateRepository, parseProjectState } from '../../src/console/persistence';
import { memoryPlanningPort } from './wave3-fixtures';

describe('ProjectStateRepository', () => {
	it('does not silently create a missing state and plans an explicit create with one focus', async () => {
		const port = memoryPlanningPort();
		const repository = new ProjectStateRepository(createDefaultConsoleProject('作品'), port, new MarkdownChangePlanner(port));
		expect(await repository.read()).toBeNull();
		await expect(repository.planUpdate({ currentFocus: 'CH-0001', storylineCursors: {} }, 'v1')).rejects.toThrow('PROJECT_STATE_NOT_CONFIGURED');
		const plan = await repository.planCreate({ currentFocus: 'CH-0001', storylineCursors: { 主线: 'EVT-0002', 支线: 'EVT-0001' } }, 'v1', '2026-01-01T00:00:00.000Z');
		expect(plan.files[0]).toMatchObject({ operation: 'create', path: '作品/总控系统/当前阶段.md' });
		expect(plan.files[0]?.content).toContain('current_focus: CH-0001');
	});

	it('reads multiple cursors and rejects malformed focus/cursor/state', async () => {
		const content = '---\nschema_version: 1\ncurrent_focus: "CH-0001"\nstoryline_cursors:\n  "主线": EVT-0002\n  支线: EVT-0003\n---\n';
		expect(parseProjectState(content)).toMatchObject({ currentFocus: 'CH-0001', storylineCursors: { 主线: 'EVT-0002', 支线: 'EVT-0003' } });
		expect(() => parseProjectState('bad')).toThrow('INVALID_PROJECT_STATE');
		expect(() => parseProjectState('schema_version: 1\ncurrent_focus: CH-0001\ncurrent_focus: CH-0002')).toThrow('INVALID_PROJECT_STATE');
		const path = '作品/总控系统/当前阶段.md';
		const port = memoryPlanningPort({ [path]: content });
		const repository = new ProjectStateRepository(createDefaultConsoleProject('作品'), port, new MarkdownChangePlanner(port));
		await expect(repository.planCreate({ currentFocus: 'CH-0001', storylineCursors: {} }, 'v1')).rejects.toThrow('PROJECT_STATE_ALREADY_EXISTS');
		await expect(repository.planUpdate({ currentFocus: 'bad', storylineCursors: {} }, 'v1')).rejects.toThrow('INVALID_CURRENT_FOCUS');
		await expect(repository.planUpdate({ currentFocus: 'CH-0001', storylineCursors: { '': 'bad' } }, 'v1')).rejects.toThrow('INVALID_STORYLINE_CURSOR');
	});
});
