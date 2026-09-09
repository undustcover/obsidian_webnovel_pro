import { describe, expect, it } from 'vitest';
import { ContextPlanner } from '../../src/console/application';
import { record, snapshot } from './wave3-fixtures';

describe('ContextPlanner', () => {
	it('expands direct relations and a bounded event prerequisite chain', () => {
		const chapter = record('chapter', 'CH-0001', { title: '章', knowledge_state: { reader: 'revealed', povCharacters: { 'CHR-0001': 'known' } } }, ['EVT-0003', 'CHR-0001']);
		const e3 = record('event', 'EVT-0003', { prerequisite_event_ids: ['EVT-0002'] });
		const e2 = record('event', 'EVT-0002', { prerequisite_event_ids: ['EVT-0001'] });
		const e1 = record('event', 'EVT-0001');
		const character = record('character', 'CHR-0001');
		const plan = new ContextPlanner(() => snapshot(chapter, e3, e2, e1, character)).plan({ target: { kind: 'chapter', key: 'CH-0001' }, policy: { relationDepth: 1, eventPrerequisiteDepth: 1 }, now: new Date('2026-01-01T00:00:00Z') });
		expect(plan.items.map(item => item.id)).toEqual(expect.arrayContaining(['CH-0001', 'EVT-0003', 'EVT-0002', 'CHR-0001']));
		expect(plan.items.map(item => item.id)).not.toContain('EVT-0001');
		expect(plan.items.find(item => item.id === 'CH-0001')?.knowledgeBoundary.pov).toEqual({ 'CHR-0001': 'known' });
		expect(plan.planId).toMatch(/^CTX-/);
	});

	it('reports missing targets and requires a published snapshot', () => {
		expect(() => new ContextPlanner(() => undefined).plan({ target: { kind: 'custom', key: 'x' } })).toThrow('Console index');
		const plan = new ContextPlanner(() => snapshot()).plan({ target: { kind: 'custom', key: 'x' }, policy: { relationDepth: 99, eventPrerequisiteDepth: -1 } });
		expect(plan.policy).toMatchObject({ relationDepth: 5, eventPrerequisiteDepth: 0 });
		expect(plan.conflicts).toContain('Target not found: x');
	});
});
