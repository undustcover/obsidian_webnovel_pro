import { describe, expect, it } from 'vitest';
import { EventGraph } from '../../src/console/application';
import { snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

describe('EventGraph', () => {
	it('calculates shortest distances in a diamond DAG', () => {
		const graph = new EventGraph(snapshot(eventRecord('EVT-0001'), eventRecord('EVT-0002', { prerequisiteEventIds: ['EVT-0001'] }), eventRecord('EVT-0003', { prerequisiteEventIds: ['EVT-0001'] }), eventRecord('EVT-0004', { prerequisiteEventIds: ['EVT-0002', 'EVT-0003'] })));
		expect(graph.distance('EVT-0001', 'EVT-0004')).toEqual({ kind: 'distance', distance: 2 });
	});

	it.each([
		['cycle', [eventRecord('EVT-0001', { prerequisiteEventIds: ['EVT-0002'] }), eventRecord('EVT-0002', { prerequisiteEventIds: ['EVT-0001'] })], 'EVT-0001', 'EVT-0002'],
		['missing_edge', [eventRecord('EVT-0001'), eventRecord('EVT-0002', { prerequisiteEventIds: ['EVT-9999'] })], 'EVT-0001', 'EVT-0002'],
		['cross_storyline', [eventRecord('EVT-0001'), eventRecord('EVT-0002', { storyline: '支线' })], 'EVT-0001', 'EVT-0002'],
		['unreachable', [eventRecord('EVT-0001'), eventRecord('EVT-0002')], 'EVT-0001', 'EVT-0002'],
	] as const)('returns an explained %s result instead of guessing', (reason, records, from, to) => {
		expect(new EventGraph(snapshot(...records)).distance(from, to)).toMatchObject({ kind: 'indeterminate', reason });
	});
});
