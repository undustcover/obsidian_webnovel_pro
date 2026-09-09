import type { ConsoleLayout } from './router';

export function layoutForWidth(width: number): ConsoleLayout {
	if (width < 760) return 'narrow';
	if (width < 1180) return 'medium';
	return 'wide';
}

export interface ResizeObserverLike { observe(target: Element): void; disconnect(): void }
export type ResizeObserverFactory = (callback: (width: number) => void) => ResizeObserverLike;

export const browserResizeObserverFactory: ResizeObserverFactory = callback => {
	const observer = new ResizeObserver(entries => {
		const entry = entries[entries.length - 1];
		if (entry) callback(entry.contentRect.width);
	});
	return observer;
};

export class ConsoleLayoutController {
	private observer?: ResizeObserverLike;
	constructor(private readonly target: HTMLElement, private readonly factory: ResizeObserverFactory = browserResizeObserverFactory) {}

	start(): ConsoleLayout {
		const initial = this.update(this.target.getBoundingClientRect().width);
		this.observer = this.factory(width => this.update(width));
		this.observer.observe(this.target);
		return initial;
	}

	update(width: number): ConsoleLayout {
		const layout = layoutForWidth(width);
		this.target.dataset.layout = layout;
		return layout;
	}

	destroy(): void { this.observer?.disconnect(); this.observer = undefined; }
}
