import { describe, expect, it } from 'vitest';
import { createChangePlanBase, ProgressionImpactAnalyzer } from '../../src/console/application';
import { record, snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

describe('ProgressionImpactAnalyzer', () => {
	it('always returns every impact category from the same snapshot', () => {
		const event = eventRecord('EVT-0001', { currentChapterIds: ['CH-0001'], characterIds: ['CHR-0001'], itemIds: ['ITM-0001'] });
		const task = record('task', 'TSK-0001', {}, ['EVT-0001']); const foreshadowing = record('foreshadowing', 'FSH-0001', {}, ['EVT-0001']);
		const snap = snapshot(event, task, foreshadowing, record('chapter', 'CH-0001'), record('character', 'CHR-0001'), record('item', 'ITM-0001'));
		const plan = createChangePlanBase({ type: 'advance-event', actor: 'author', requestedAt: '2026-01-01T00:00:00.000Z', targetKeys: ['EVT-0001'], payload: {} }, snap.version, [{ path: event.source.path, field: 'event_status', before: 'planned', after: 'occurred' }]);
		const report = new ProgressionImpactAnalyzer().analyze(plan, snap);
		expect(report).toMatchObject({ events: ['EVT-0001'], tasks: ['TSK-0001'], foreshadowing: ['FSH-0001'], characters: ['CHR-0001'], items: ['ITM-0001'], chapters: ['CH-0001'], knowledgeStates: ['EVT-0001'], importantChangeSuggested: true });
		for (const key of ['incomingLinks', 'outgoingLinks', 'contexts', 'healthItems', 'newNowActions', 'newMissedActions', 'unknownRisks'] as const) expect(Array.isArray(report[key])).toBe(true);
	});
});
