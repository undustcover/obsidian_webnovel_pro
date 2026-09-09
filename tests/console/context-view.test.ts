import { describe, expect, it, vi } from 'vitest';
import { renderContextPage, withContextInclusion } from '../../src/console/ui';
import type { ContextPlan } from '../../src/console/domain';
import { FakeElement } from './fake-element';

const plan: ContextPlan = {
	schemaVersion: 'console.context.v1', planId: 'CTX-1', target: { kind: 'chapter', key: 'CH-0001' }, generatedAt: '2026-01-01T00:00:00.000Z', snapshotVersion: 'v1',
	policy: { relationDepth: 1, eventPrerequisiteDepth: 2, defaultGovernance: 'canon-active-current' }, conflicts: ['目标存在冲突'],
	items: [{ key: 'CHR-0001', id: 'CHR-0001', path: '作品/人物.md', type: 'character', title: '林澈', inclusion: 'auto_included', reasons: ['直接关系'], relationship: 'relation:1', canon: 'canon', lifecycleStatus: 'active', contextScope: 'current', reviewStatus: 'pending_review', containsUnrevealed: true, knowledgeBoundary: { reader: 'hidden', pov: {}, allowedReveal: '第一章' }, hasConflict: true, modifiedAt: '2026-01-01T00:00:00.000Z', summary: '人物摘要' }],
};

describe('ContextPage', () => {
	it('shows every audit field and exposes keyboard-native inclusion controls', () => {
		const root = new FakeElement();
		const onChange = vi.fn();
		renderContextPage(root as unknown as HTMLElement, plan, onChange);
		expect(root.textContent).toContain('原因：直接关系');
		expect(root.textContent).toContain('权威/生命周期/范围/复核');
		expect(root.textContent).toContain('含未揭示信息');
		expect(root.textContent).toContain('存在资料冲突');
		const button = root.findAll('button').find(item => item.textContent === '手动排除')!;
		button.click();
		expect(onChange).toHaveBeenCalledWith('CHR-0001', 'manual_excluded');
		expect(button.tagName).toBe('BUTTON');
	});

	it('changes only the selected item without mutating the source plan', () => {
		const next = withContextInclusion(plan, 'CHR-0001', 'manual_included');
		expect(next.items[0]?.inclusion).toBe('manual_included');
		expect(plan.items[0]?.inclusion).toBe('auto_included');
	});
});
