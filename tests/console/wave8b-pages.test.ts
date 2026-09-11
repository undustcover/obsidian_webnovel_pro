import { describe, expect, it, vi } from 'vitest';
import type { DashboardModel, Suggestion } from '../../src/console/application';
import type { MilestoneData } from '../../src/console/domain';
import { renderCurrentStagePage, renderCurrentTasksPage, renderEventCreateForm, createEventData, renderForeshadowingDetails, renderMilestoneDetails, renderSuggestions } from '../../src/console/ui';
import { FakeElement } from './fake-element';
import { record } from './wave3-fixtures';

const root = () => new FakeElement() as unknown as HTMLElement;

describe('Wave 8B page semantics', () => {
	it('renders first-time stage creation and storyline-scoped cursor controls', () => {
		const missingFake = new FakeElement(); const missing = missingFake as unknown as HTMLElement;
		renderCurrentStagePage(missing, { state: null, focusCandidates: [record('chapter', 'CH-0001')], cursorTargets: [], onSaveFocus: vi.fn(), onAdvanceCursor: vi.fn() });
		expect(missing.textContent).toContain('当前阶段尚未配置');
		expect(missingFake.children.some(child => child.tagName === 'FORM')).toBe(true);

		const configuredFake = new FakeElement(); const configured = configuredFake as unknown as HTMLElement; const onSaveFocus = vi.fn();
		renderCurrentStagePage(configured, { state: { schemaVersion: 1, currentFocus: 'CH-0001', storylineCursors: { 主线: 'EVT-0001' } }, focusCandidates: [record('chapter', 'CH-0001')], cursorTargets: [{ id: 'EVT-0001', title: '开端', storyline: '主线' }], onSaveFocus, onAdvanceCursor: vi.fn() });
		expect(configured.textContent).toContain('主线：EVT-0001');
		expect(configured.textContent).toContain('预览推进');
		configuredFake.findAll('SELECT')[0]!.value = '';
		configuredFake.findAll('FORM')[0]!.dispatch('submit');
		expect(onSaveFocus).toHaveBeenCalledWith({ currentFocus: null, storylineCursors: { 主线: 'EVT-0001' } }, expect.anything());
	});

	it('creates a complete safe event default and exposes creation preview', () => {
		const data = createEventData({ id: 'EVT-0002', title: '转折', storyline: ' 主线 ' });
		expect(data).toMatchObject({ eventStatus: 'planned', narrativeStatus: 'unassigned', readerState: 'unknown', storyline: '主线' });
		expect(data.timelineViews.reality).toEqual({ visible: true, importance: 'normal' });
		const container = root(); renderEventCreateForm(container, vi.fn());
		expect(container.textContent).toContain('预览创建');
		expect((container as unknown as FakeElement).findAll('INPUT')).toHaveLength(3);
	});

	it('renders five task groups, evidence, anchors, and legacy read-only feedback', () => {
		const action = { key: 'legacy:task', title: '旧任务', group: 'now' as const, source: 'task' as const, reason: '锚点已到', anchorIds: ['EVT-0001'], priority: 'normal' as const };
		const dashboard = { configured: true, storylineCursors: {}, indexStatus: 'ready', availability: { status: 'ready', recordCount: 1, snapshotVersion: 'S1' }, healthCount: 0, actionGroups: { now: [action], missed: [], upcoming: [], later: [], needs_confirmation: [] } } as unknown as DashboardModel;
		const fake = new FakeElement(); const container = fake as unknown as HTMLElement;
		renderCurrentTasksPage(container, { dashboard, anchors: [{ id: 'EVT-0001', title: '事件', type: 'event' }], writableTaskIds: new Set(), onCreate: vi.fn(), onStatus: vi.fn(), onOpen: vi.fn() });
		expect(container.textContent).toContain('task · 锚点已到 · 锚点 EVT-0001');
		expect(container.textContent).toContain('Legacy 任务只读');
		expect(fake.children.filter(child => child.className === 'webnovel-console__section')).toHaveLength(6);
	});

	it('offers all five suggestion decisions including task conversion', () => {
		const suggestion: Suggestion = { id: 'SUG-1', ruleId: 'RULE', targetKey: 'EVT-0001', anchorId: 'EVT-0001', message: '补写场景' };
		const container = root(); renderSuggestions(container, [suggestion], vi.fn());
		for (const label of ['接受', '延后', '忽略一次', '不适用', '转为任务']) expect(container.textContent).toContain(label);
	});

	it('shows all foreshadowing anchors and keeps legacy data read-only', () => {
		const recordValue = record('foreshadowing', 'FORESHADOWING-0001', { truth_event_ids: ['EVT-0001'], plant_before: ['EVT-0002'], advance_when: ['EVT-0003'], reveal_after: ['EVT-0004'], legacyKind: 'legacy' });
		const container = root(); renderForeshadowingDetails(container, { record: recordValue, writable: false, diagnostics: [] }, vi.fn());
		for (const value of ['EVT-0001', 'EVT-0002', 'EVT-0003', 'EVT-0004', 'Legacy 伏笔只读']) expect(container.textContent).toContain(value);
	});

	it('renders milestone completion mode, required events, evaluation, and progression', () => {
		const data: MilestoneData = { status: 'active', storyline: '主线', completion: { mode: 'sequence', requiredEventIds: ['EVT-0001', 'EVT-0002'] }, relatedPartIds: [], relatedVolumeIds: [], relatedUnitIds: [] };
		const container = root(); renderMilestoneDetails(container, { record: record('milestone', 'MLS-0001'), data, evaluation: 'completion_ready' }, vi.fn());
		expect(container.textContent).toContain('模式：sequence');
		expect(container.textContent).toContain('EVT-0001, EVT-0002 · 求值：completion_ready');
		expect(container.textContent).toContain('预览里程碑推进');
	});
});
