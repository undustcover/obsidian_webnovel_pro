import { describe, expect, it } from 'vitest';
import { createDefaultConsoleProject } from '../../src/console/config';
import { EventRepository, MarkdownChangePlanner, eventDataFromRecord } from '../../src/console/persistence';
import { memoryPlanningPort, snapshot } from './wave3-fixtures';
import { eventData, eventRecord } from './wave4-fixtures';

describe('EventRepository', () => {
	it('reads the complete event truth model including open-ended intervals and cross-calendar values', () => {
		const record = eventRecord('EVT-0001', { storyTime: { display: '春', sortKey: '001', calendar: '王历', precision: 'season' }, storyTimeEnd: null, currentChapterIds: ['CH-0001', 'CH-0002'] });
		expect(eventDataFromRecord(record)).toMatchObject({ storyTime: { calendar: '王历' }, storyTimeEnd: null, currentChapterIds: ['CH-0001', 'CH-0002'] });
	});

	it('plans safe create/update round trips without writing chapter projections', async () => {
		const existing = eventRecord('EVT-0001'); const source = '---\ntype: event\nid: EVT-0001\n---\n# EVT-0001\n';
		const port = memoryPlanningPort({ [existing.source.path]: source });
		const repository = new EventRepository(() => snapshot(existing), createDefaultConsoleProject('作品'), port, new MarkdownChangePlanner(port));
		const update = await repository.planUpdate('EVT-0001', eventData({ currentChapterIds: ['CH-0009'], storyTimeEnd: null }), '2026-01-01T00:00:00.000Z');
		expect(update.files[0]?.content).toContain('current_chapter_ids: ["CH-0009"]');
		expect(update.files[0]?.content).not.toContain('chapter_events');
		expect(update.files[0]?.content).toContain('# EVT-0001');
		const create = await repository.planCreate({ id: 'EVT-0002', title: '相遇', data: eventData({ storyline: '支线' }) }, '2026-01-01T00:00:00.000Z');
		expect(create.files[0]).toMatchObject({ operation: 'create', path: '作品/事件数据库/EVT-0002-相遇.md' });
	});

	it('rejects occurring events without a start time', async () => {
		const port = memoryPlanningPort(); const repository = new EventRepository(() => snapshot(), createDefaultConsoleProject('作品'), port, new MarkdownChangePlanner(port));
		await expect(repository.planCreate({ id: 'EVT-0001', title: '进行中', data: eventData({ eventStatus: 'occurring' }) })).rejects.toThrow('EVENT_TIME_REQUIRED_FOR_OCCURRING');
	});
});
