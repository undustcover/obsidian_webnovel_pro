import { describe, expect, it, vi } from 'vitest';
import type { ConsoleAvailabilityState } from '../../src/console/domain';
import { renderIndexStatusPanel } from '../../src/console/ui/IndexStatusPanel';
import { FakeElement } from './fake-element';

const states: ConsoleAvailabilityState[] = [
	{ status: 'unconfigured', code: 'CONSOLE_PROJECT_UNCONFIGURED', message: '尚未配置', retryable: false, suggestedActions: ['configure'] },
	{ status: 'initializing', code: 'INDEX_INITIALIZING', projectId: 'p1', message: '正在扫描', retryable: false, suggestedActions: [], processed: 2, total: 5 },
	{ status: 'ready', code: 'INDEX_READY', projectId: 'p1', message: '已就绪', retryable: false, suggestedActions: [], snapshotVersion: 's1', recordCount: 3 },
	{ status: 'degraded', code: 'INDEX_SCAN_FAILED', projectId: 'p1', message: '部分失败', retryable: true, suggestedActions: ['retry', 'rebuild'], snapshotVersion: 's1', recordCount: 2, failedPaths: ['作品/坏文件.md'] },
	{ status: 'error', code: 'INDEX_SCAN_FAILED', projectId: 'p1', message: '扫描失败', technicalDetail: 'disk failed', retryable: true, suggestedActions: ['retry', 'rebuild'] },
];

const render = (state: ConsoleAvailabilityState, actions = {}) => {
	const root = new FakeElement();
	return { root, panel: renderIndexStatusPanel(root as unknown as HTMLElement, state, actions) as unknown as FakeElement };
};

describe('IndexStatusPanel', () => {
	it.each(states)('renders the $status state with visible non-color status text', state => {
		const { panel } = render(state);
		expect(panel.className).toContain(`is-${state.status}`);
		expect(panel.textContent).toContain(state.message);
		expect(panel.attributes.role).toBe(state.status === 'error' ? 'alert' : 'status');
		expect(panel.attributes['aria-live']).toBe(state.status === 'error' ? 'assertive' : 'polite');
	});

	it('shows progress, record metadata, failed paths and technical detail in the applicable states', () => {
		const initializing = render(states[1]).panel;
		expect(initializing.findAll('progress')[0]?.attributes).toMatchObject({ max: '5', value: '2', 'aria-label': '小说项目索引进度' });
		expect(initializing.textContent).toContain('2 / 5');

		expect(render(states[2]).panel.textContent).toContain('记录 3 条');
		expect(render(states[3]).panel.textContent).toContain('作品/坏文件.md');
		expect(render(states[4]).panel.textContent).toContain('disk failed');
	});

	it('renders only suggested actions as labeled native buttons', () => {
		const configure = vi.fn();
		const retry = vi.fn();
		const rebuild = vi.fn();
		const unconfiguredButtons = render(states[0], { onConfigure: configure, onRetry: retry, onRebuild: rebuild }).panel.findAll('button');
		expect(unconfiguredButtons.map(button => button.textContent)).toEqual(['配置项目']);
		expect(unconfiguredButtons[0]?.attributes).toMatchObject({ type: 'button', 'aria-label': '配置项目' });

		expect(render(states[1], { onRetry: retry }).panel.findAll('button')).toHaveLength(0);
		expect(render(states[2], { onRetry: retry }).panel.findAll('button')).toHaveLength(0);
		expect(render(states[4], { onRetry: retry, onRebuild: rebuild }).panel.findAll('button').map(button => button.textContent)).toEqual(['重试索引', '清除缓存并重建']);
	});

	it('runs retry/rebuild actions with shared loading state and announces failures', async () => {
		let rejectRetry: (error: Error) => void = () => undefined;
		const retry = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectRetry = reject; }));
		const rebuild = vi.fn().mockResolvedValue(undefined);
		const { panel } = render(states[4], { onRetry: retry, onRebuild: rebuild });
		const buttons = panel.findAll('button');

		buttons[0]?.click();
		await Promise.resolve();
		expect(retry).toHaveBeenCalledOnce();
		expect(buttons.every(button => button.disabled)).toBe(true);
		expect(panel.textContent).toContain('正在重试索引');

		rejectRetry(new Error('permission denied'));
		await vi.waitFor(() => expect(panel.textContent).toContain('恢复失败：permission denied'));
		expect(buttons.every(button => !button.disabled)).toBe(true);
	});
});
