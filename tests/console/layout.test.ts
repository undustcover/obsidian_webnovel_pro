import { describe, expect, it, vi } from 'vitest';
import { ConsoleLayoutController, layoutForWidth, type ResizeObserverLike } from '../../src/console/ui/layout';

describe('Console leaf layout', () => {
	it('uses the frozen 760/1180 container breakpoints', () => {
		expect(layoutForWidth(759)).toBe('narrow');
		expect(layoutForWidth(760)).toBe('medium');
		expect(layoutForWidth(1179)).toBe('medium');
		expect(layoutForWidth(1180)).toBe('wide');
	});

	it('reacts to continuous resize and disconnects on close', () => {
		let callback!: (width: number) => void;
		const observer: ResizeObserverLike = { observe: vi.fn(), disconnect: vi.fn() };
		const target = { dataset: {}, getBoundingClientRect: () => ({ width: 1200 }) } as unknown as HTMLElement;
		const controller = new ConsoleLayoutController(target, cb => { callback = cb; return observer; });
		expect(controller.start()).toBe('wide');
		callback(700);
		expect(target.dataset.layout).toBe('narrow');
		callback(900);
		expect(target.dataset.layout).toBe('medium');
		controller.destroy();
		expect(observer.disconnect).toHaveBeenCalledOnce();
	});
});
