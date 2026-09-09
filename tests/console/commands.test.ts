import { describe, expect, it } from 'vitest';
import {
	classifyCommandRisk, createChangePlanBase, createEmptyImpactReport, createPlanId,
	type ConsoleCommand,
} from '../../src/console/application';

const command: ConsoleCommand = {
	type: 'advance-event', actor: 'author', requestedAt: '2026-09-09T12:00:00+08:00',
	targetKeys: ['EVT-0001'], payload: { status: 'occurred' },
};

describe('Console command contracts', () => {
	it('classifies high-risk commands and unknown writes as confirmation-required', () => {
		expect(classifyCommandRisk('advance-event')).toEqual({ risk: 'high', requiresConfirmation: true });
		expect(classifyCommandRisk('unregistered-write')).toEqual({ risk: 'high', requiresConfirmation: true });
	});

	it('creates a deterministic plan id and complete empty impact categories', () => {
		expect(createPlanId(command, 'snapshot-1')).toBe(createPlanId(structuredClone(command), 'snapshot-1'));
		const plan = createChangePlanBase(command, 'snapshot-1');
		expect(plan.requiresConfirmation).toBe(true);
		const impact = createEmptyImpactReport(plan.planId);
		for (const key of ['incomingLinks', 'outgoingLinks', 'events', 'tasks', 'foreshadowing', 'characters', 'items', 'knowledgeStates', 'chapters', 'contexts', 'healthItems', 'newNowActions', 'newMissedActions', 'unknownRisks'] as const) {
			expect(impact[key]).toEqual([]);
		}
	});
});
