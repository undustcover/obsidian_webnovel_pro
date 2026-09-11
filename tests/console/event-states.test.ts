import { describe, expect, it } from 'vitest';
import { EventCommandService } from '../../src/console/application';
import { createDefaultConsoleProject } from '../../src/console/config';
import { EventRepository, MarkdownChangePlanner } from '../../src/console/persistence';
import { memoryPlanningPort, snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

const setup = () => {
	const event = eventRecord('EVT-0001', { storyTime: { display: '第一日', precision: 'day' }, timelineViews: { reality: { visible: true, importance: 'normal' }, hiddenWorld: { visible: true, importance: 'critical' }, characters: {}, organizations: {} } });
	const port = memoryPlanningPort({ [event.source.path]: '---\ntype: event\nid: EVT-0001\n---\n' });
	return new EventCommandService(new EventRepository(() => snapshot(event), createDefaultConsoleProject('作品'), port, new MarkdownChangePlanner(port)));
};

describe('event commands', () => {
	it('changes only the selected timeline importance diff', async () => {
		const plan = await setup().updateTimelineImportance('EVT-0001', 'reality', 'major', '2026-01-01T00:00:00.000Z');
		expect(plan.fieldDiffs).toEqual([{ path: '作品/EVT-0001.md', field: 'timeline_views.reality.importance', before: 'normal', after: 'major' }]);
		expect(plan.files[0]?.content).toContain('"hidden_world":{"visible":true,"importance":"critical"}');
	});

	it.each([
		['hidden_world', 'timeline_views.hidden_world.importance'],
		['cosmic', 'timeline_views.cosmic.importance'],
		['character:CHR-0001', 'timeline_views.character:CHR-0001.importance'],
		['organization:ORG-0001', 'timeline_views.organization:ORG-0001.importance'],
	] as const)('isolates the %s importance branch', async (target, field) => {
		const plan = await setup().updateTimelineImportance('EVT-0001', target, 'minor', '2026-01-01T00:00:00.000Z');
		expect(plan.fieldDiffs).toHaveLength(1);
		expect(plan.fieldDiffs[0]?.field).toBe(field);
	});

	it('rejects an invalid view and occurring without a start time', async () => {
		await expect(setup().updateTimelineImportance('EVT-0001', 'invalid' as never, 'minor')).rejects.toThrow('INVALID_TIMELINE_VIEW');
		const event = eventRecord('EVT-0001');
		const port = memoryPlanningPort({ [event.source.path]: '---\ntype: event\nid: EVT-0001\n---\n' });
		const service = new EventCommandService(new EventRepository(() => snapshot(event), createDefaultConsoleProject('作品'), port, new MarkdownChangePlanner(port)));
		await expect(service.updateEventStatus('EVT-0001', 'occurring')).rejects.toThrow('EVENT_TIME_REQUIRED_FOR_OCCURRING');
	});

	it('keeps fact, narrative, and reader state changes isolated and rejects forbidden transitions', async () => {
		const service = setup();
		const fact = await service.updateEventStatus('EVT-0001', 'occurred', '2026-01-01T00:00:00.000Z');
		expect(fact.fieldDiffs.map(diff => diff.field)).toEqual(['event_status']);
		const narrative = await service.updateNarrativeStatus('EVT-0001', 'outlined', '2026-01-01T00:00:00.000Z');
		expect(narrative.fieldDiffs.map(diff => diff.field)).toEqual(['narrative_status']);
		const reader = await service.updateReaderState('EVT-0001', 'revealed', '2026-01-01T00:00:00.000Z');
		expect(reader.fieldDiffs.map(diff => diff.field)).toEqual(['reader_state']);
		await expect(service.updateEventStatus('EVT-0001', 'planned')).rejects.toThrow('EVENT_STATE_TRANSITION_NOT_ALLOWED');
	});
});
