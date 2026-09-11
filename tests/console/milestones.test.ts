import { describe, expect, it } from 'vitest';
import { MilestoneEvaluator } from '../../src/console/application';
import type { MilestoneData } from '../../src/console/domain';
import { snapshot } from './wave3-fixtures';
import { eventRecord } from './wave4-fixtures';

const milestone = (mode: MilestoneData['completion']['mode'], ids = ['EVT-0001', 'EVT-0002']): MilestoneData => ({ storyline: '主线', status: 'active', completion: { mode, requiredEventIds: ids }, relatedPartIds: [], relatedVolumeIds: [], relatedUnitIds: [] });

describe('MilestoneEvaluator', () => {
	it('evaluates all, any, sequence, and manual without writing completed', () => {
		const first = eventRecord('EVT-0001', { eventStatus: 'occurred', timelineOrder: 1 });
		const second = eventRecord('EVT-0002', { eventStatus: 'occurred', timelineOrder: 2 });
		const evaluator = new MilestoneEvaluator(snapshot(first, second));
		expect(evaluator.evaluate(milestone('all'))).toBe('completion_ready');
		expect(evaluator.evaluate(milestone('any'))).toBe('completion_ready');
		expect(evaluator.evaluate(milestone('sequence'))).toBe('completion_ready');
		expect(evaluator.evaluate(milestone('sequence', ['EVT-0002', 'EVT-0001']))).toBe('not_ready');
		expect(evaluator.evaluate(milestone('manual'))).toBe('manual_review');
	});

	it('returns indeterminate for missing or incomparable sequence events', () => {
		const evaluator = new MilestoneEvaluator(snapshot(eventRecord('EVT-0001', { eventStatus: 'occurred' }), eventRecord('EVT-0002', { eventStatus: 'occurred' })));
		expect(evaluator.evaluate(milestone('sequence'))).toBe('indeterminate');
		expect(evaluator.evaluate(milestone('all', ['EVT-9999']))).toBe('indeterminate');
	});
});
