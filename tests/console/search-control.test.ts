import { describe, expect, it, vi } from 'vitest';
import { renderConsoleSearch, renderDetailsDismiss, shouldRenderDashboard } from '../../src/console/ui/NovelConsoleView';
import { FakeElement } from './fake-element';

describe('Console search control', () => {
	it('uses Dashboard only for an empty overview query', () => {
		expect(shouldRenderDashboard('overview', '')).toBe(true);
		expect(shouldRenderDashboard('overview', '   ')).toBe(true);
		expect(shouldRenderDashboard('overview', 'Wave7-A-人物')).toBe(false);
		expect(shouldRenderDashboard('lore/characters', '')).toBe(false);
	});

	it('supports live input, an explicit submit button, and form submission for Enter', () => {
		const host = new FakeElement();
		const onSearch = vi.fn();
		renderConsoleSearch(host as unknown as HTMLElement, '初始', onSearch);

		const form = host.findAll('form')[0];
		const input = host.findAll('input')[0];
		const button = host.findAll('button')[0];
		expect(form.attributes).toMatchObject({ role: 'search', 'aria-label': '资料搜索' });
		expect(input.value).toBe('初始');
		expect(button.textContent).toBe('搜索');
		expect(button.attributes).toMatchObject({ type: 'submit', 'aria-label': '执行搜索' });

		input.value = 'Wave7-A-人物';
		input.dispatch('input');
		expect(onSearch).toHaveBeenLastCalledWith('Wave7-A-人物');

		input.value = 'Wave7-B-人物';
		form.dispatch('submit');
		expect(onSearch).toHaveBeenLastCalledWith('Wave7-B-人物');
	});

	it('renders an explicit details dismiss button', () => {
		const host = new FakeElement();
		const onClose = vi.fn();
		renderDetailsDismiss(host as unknown as HTMLElement, onClose);
		const button = host.findAll('button')[0];
		expect(button.textContent).toBe('关闭');
		expect(button.attributes).toMatchObject({ type: 'button', 'aria-label': '关闭资料详情' });
		button.click();
		expect(onClose).toHaveBeenCalledOnce();
	});
});
