import { describe, expect, it } from 'vitest';
import { ChapterWorkspaceCommandService, MarkdownChangePlanner } from '../../src/console/persistence';
import { memoryPlanningPort, record, snapshot } from './wave3-fixtures';

describe('ChapterWorkspaceCommandService', () => {
	it('edits only whitelisted frontmatter, removes an old multiline list, and preserves long body', async () => {
		const chapter = record('chapter', 'CH-0001', { title: '旧标题' });
		const original = '---\ntitle: 旧标题\nevent_ids:\n  - EVT-0001\nstatus: draft\n---\n很长的正文\n第二段';
		const port = memoryPlanningPort({ [chapter.source.path]: original });
		const service = new ChapterWorkspaceCommandService(() => snapshot(chapter), port, new MarkdownChangePlanner(port));
		const plan = await service.planUpdate('CH-0001', { title: '新标题', event_ids: ['EVT-0002'], chapter_no: 3 }, '2026-01-01T00:00:00.000Z');
		expect(plan.risk).toBe('medium');
		expect(plan.requiresConfirmation).toBe(true);
		expect(plan.files[0]?.content).toContain('event_ids: ["EVT-0002"]');
		expect(plan.files[0]?.content).not.toContain('  - EVT-0001');
		expect(plan.files[0]?.content).toContain('很长的正文\n第二段');
	});

	it('fails closed for body, unknown fields, missing index/chapter/source', async () => {
		const chapter = record('chapter', 'CH-0001');
		const port = memoryPlanningPort();
		const planner = new MarkdownChangePlanner(port);
		await expect(new ChapterWorkspaceCommandService(() => undefined, port, planner).planUpdate('CH-0001', {})).rejects.toThrow('INDEX_UNAVAILABLE');
		await expect(new ChapterWorkspaceCommandService(() => snapshot(chapter), port, planner).planUpdate('bad', {})).rejects.toThrow('CHAPTER_NOT_FOUND');
		await expect(new ChapterWorkspaceCommandService(() => snapshot(chapter), port, planner).planUpdate('CH-0001', { body: '禁止' })).rejects.toThrow('CHAPTER_FIELD_NOT_EDITABLE:body');
		await expect(new ChapterWorkspaceCommandService(() => snapshot(chapter), port, planner).planUpdate('CH-0001', {})).rejects.toThrow('CHAPTER_SOURCE_NOT_FOUND');
	});
});
