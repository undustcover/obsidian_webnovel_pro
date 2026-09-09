import { describe, expect, it } from 'vitest';
import { ContextPlanner } from '../../src/console/application';
import { record, snapshot } from './wave3-fixtures';

describe('context governance policy', () => {
	it.each([
		[{ canon: 'candidate' }, 'candidate'], [{ lifecycle_status: 'deprecated' }, 'deprecated'],
		[{ lifecycle_status: 'archived' }, 'archived'], [{ context_scope: 'history' }, 'history'], [{ context_scope: 'test' }, 'test'],
	])('excludes non-current governed records by default (%s: %s)', (data, _label) => {
		const target = record('chapter', 'CH-0001', { title: 'target' }, ['CHR-0001']);
		const candidate = record('character', 'CHR-0001', data);
		const plan = new ContextPlanner(() => snapshot(target, candidate)).plan({ target: { kind: 'chapter', key: 'CH-0001' } });
		expect(plan.items.map(item => item.id)).not.toContain('CHR-0001');
	});

	it('manual exclusion wins, manual inclusion overrides candidate policy, archived remains blocked', () => {
		const target = record('chapter', 'CH-0001', {}, ['CHR-0001', 'CHR-0002']);
		const candidate = record('character', 'CHR-0001', { canon: 'candidate' });
		const archived = record('character', 'CHR-0002', { lifecycle_status: 'archived' });
		const plan = new ContextPlanner(() => snapshot(target, candidate, archived)).plan({ target: { kind: 'chapter', key: 'CH-0001' }, manual: { included: ['CHR-0001', 'CHR-0002'], excluded: ['CH-0001', 'missing'] } });
		expect(plan.items.find(item => item.id === 'CH-0001')?.inclusion).toBe('manual_excluded');
		expect(plan.items.find(item => item.id === 'CHR-0001')?.inclusion).toBe('manual_included');
		expect(plan.items.map(item => item.id)).not.toContain('CHR-0002');
		expect(plan.conflicts).toEqual(expect.arrayContaining(['Manual exclude not found: missing', 'Archived item cannot be included: CHR-0002']));
	});
});
