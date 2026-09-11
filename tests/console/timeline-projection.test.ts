import { describe, expect, it } from 'vitest';
import { TimelineProjectionQuery } from '../../src/console/application';
import { snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

describe('TimelineProjectionQuery', () => {
	it('projects one event into multiple views without copying its identity', () => {
		const event = eventRecord('EVT-0001', { timelineViews: { reality: { visible: true, importance: 'major' }, hiddenWorld: { visible: true, importance: 'critical' }, cosmic: { visible: false, importance: 'normal' }, characters: { 'CHR-0001': 'minor' }, organizations: {} } });
		const query = new TimelineProjectionQuery(() => snapshot(event));
		expect(query.execute('reality').items[0]?.event).toBe(event);
		expect(query.execute('hidden_world').items[0]?.event).toBe(event);
		expect(query.execute('character:CHR-0001').items[0]?.event).toBe(event);
		expect(query.execute('cosmic').items).toHaveLength(0);
	});

	it('does not invent cross-calendar ordering and uses timeline order only as an auxiliary', () => {
		const a = eventRecord('EVT-0001', { storyTime: { display: '1', sortKey: '1', calendar: '甲历', precision: 'day' }, timelineOrder: 2, timelineViews: { reality: { visible: true }, characters: {}, organizations: {} } });
		const b = eventRecord('EVT-0002', { storyTime: { display: '1', sortKey: '1', calendar: '乙历', precision: 'day' }, timelineOrder: 1, timelineViews: { reality: { visible: true }, characters: {}, organizations: {} } });
		const result = new TimelineProjectionQuery(() => snapshot(a, b)).execute('reality');
		expect(new Set(result.items.map(item => item.timeGroup))).toEqual(new Set(['甲历', '乙历']));
		expect(result.warnings).toContain('CROSS_CALENDAR_NOT_COMPARABLE');
	});

	it('reports an unmapped event as missing comparable time rather than a different calendar', () => {
		const dated = eventRecord('EVT-0001', { storyTime: { display: '永曜历 412 年冬', sortKey: '0412-WI-001', calendar: 'yongyao', precision: 'day' }, timelineViews: { reality: { visible: true }, characters: {}, organizations: {} } });
		const unmapped = eventRecord('EVT-0002', { storyTime: undefined, timelineViews: { reality: { visible: true }, characters: {}, organizations: {} } });
		const result = new TimelineProjectionQuery(() => snapshot(dated, unmapped)).execute('reality');
		expect(result.warnings).toContain('STORY_TIME_NOT_COMPARABLE');
		expect(result.warnings).not.toContain('CROSS_CALENDAR_NOT_COMPARABLE');
	});
});
