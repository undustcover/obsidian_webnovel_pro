import { describe, expect, it } from 'vitest';
import { CursorQuery } from '../../src/console/application';
import { snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

describe('CursorQuery', () => {
	it('restores multiple storyline cursors and only derives a suggestion', () => {
		const first = eventRecord('EVT-0001'); const next = eventRecord('EVT-0002', { prerequisiteEventIds: ['EVT-0001'] }); const side = eventRecord('EVT-0003', { storyline: '支线' });
		const query = new CursorQuery(() => snapshot(first, next, side));
		const state = { schemaVersion: 1 as const, currentFocus: 'CH-0001', storylineCursors: { 主线: 'EVT-0001', 支线: 'EVT-0003' } };
		expect(query.lines(state).map(line => [line.storyline, line.cursorId, line.valid])).toEqual([['支线', 'EVT-0003', true], ['主线', 'EVT-0001', true]]);
		expect(query.suggestForOpenedEvent(state, 'EVT-0002')).toMatchObject({ suggestedEventId: 'EVT-0002', distance: { kind: 'distance', distance: 1 } });
		expect(state.storylineCursors.主线).toBe('EVT-0001');
	});

	it('explains an unreachable suggestion without moving the cursor', () => {
		const query = new CursorQuery(() => snapshot(eventRecord('EVT-0001'), eventRecord('EVT-0002')));
		expect(query.suggestForOpenedEvent({ schemaVersion: 1, currentFocus: 'CH-0001', storylineCursors: { 主线: 'EVT-0001' } }, 'EVT-0002')?.distance).toMatchObject({ kind: 'indeterminate', reason: 'unreachable' });
	});
});
