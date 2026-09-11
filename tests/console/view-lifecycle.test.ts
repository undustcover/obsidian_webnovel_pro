import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceLeaf } from 'obsidian';
import type { ConsoleApplicationEvent, ConsoleApplicationListener } from '../../src/console/application';
import type { ConsoleAvailabilityState } from '../../src/console/domain';
import { NovelConsoleView } from '../../src/console/ui/NovelConsoleView';
import type { WebNovelAssistantPlugin } from '../../src/types/plugin';

const availability = (status: ConsoleAvailabilityState['status']): ConsoleAvailabilityState => {
	if (status === 'ready') return { status, code: 'INDEX_READY', projectId: 'p1', message: 'ready', retryable: false, suggestedActions: [], snapshotVersion: 's1', recordCount: 1 };
	if (status === 'degraded') return { status, code: 'INDEX_SCAN_FAILED', projectId: 'p1', message: 'degraded', retryable: true, suggestedActions: ['retry'], snapshotVersion: 's1', recordCount: 1, failedPaths: ['bad.md'] };
	if (status === 'error') return { status, code: 'INDEX_SCAN_FAILED', projectId: 'p1', message: 'error', retryable: true, suggestedActions: ['retry'], technicalDetail: 'failed' };
	if (status === 'unconfigured') return { status, code: 'CONSOLE_PROJECT_UNCONFIGURED', message: 'unconfigured', retryable: false, suggestedActions: ['configure'] };
	return { status, code: 'INDEX_INITIALIZING', projectId: 'p1', message: 'initializing', retryable: false, suggestedActions: [], processed: 0, total: 1 };
};

function lifecycleFixture(initialStatus: ConsoleAvailabilityState['status']) {
	let current = availability(initialStatus);
	let listener: ConsoleApplicationListener | undefined;
	let sequence = 0;
	const unsubscribe = vi.fn();
	const application = {
		subscribe: vi.fn((next: ConsoleApplicationListener) => {
			listener = next;
			next({ sequence: ++sequence, reason: 'current', projectIds: ['p1'], activeProjectId: 'p1', projectId: 'p1', availability: current });
			return unsubscribe;
		}),
		getIndexState: vi.fn(() => current),
	};
	const plugin = {
		services: { getOptional: vi.fn(() => application) },
		app: { vault: {}, workspace: {} },
	} as unknown as WebNovelAssistantPlugin;
	const leaf = new WorkspaceLeaf();
	Object.assign(leaf, { app: plugin.app });
	const view = new NovelConsoleView(leaf, plugin);
	const renderedStatuses: string[] = [];
	(view as unknown as { render: () => void }).render = vi.fn(() => renderedStatuses.push(current.status));
	const emit = (status: ConsoleAvailabilityState['status'], reason: ConsoleApplicationEvent['reason'] = 'index-state') => {
		current = availability(status);
		listener?.({ sequence: ++sequence, reason, projectIds: ['p1'], activeProjectId: 'p1', projectId: 'p1', availability: current });
	};
	return { view, application, unsubscribe, renderedStatuses, emit };
}

describe('NovelConsoleView application subscription lifecycle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('window', { setTimeout, clearTimeout });
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('opens during initialization and refreshes to ready without navigation', async () => {
		const fixture = lifecycleFixture('initializing');
		const navigate = vi.spyOn(fixture.view, 'navigate');
		await fixture.view.onOpen();
		expect(fixture.renderedStatuses).toEqual(['initializing']);

		fixture.emit('initializing');
		fixture.emit('ready', 'cache');
		vi.advanceTimersByTime(50);

		expect(fixture.renderedStatuses).toEqual(['initializing', 'ready']);
		expect(navigate).not.toHaveBeenCalled();
	});

	it('renders an already-ready application once when the view opens late', async () => {
		const fixture = lifecycleFixture('ready');
		await fixture.view.onOpen();

		expect(fixture.application.subscribe).toHaveBeenCalledOnce();
		expect(fixture.renderedStatuses).toEqual(['ready']);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('unsubscribes and ignores queued or late notifications after close', async () => {
		const fixture = lifecycleFixture('initializing');
		await fixture.view.onOpen();
		fixture.emit('ready', 'cache');

		await fixture.view.onClose();
		fixture.emit('error');
		vi.runAllTimers();

		expect(fixture.unsubscribe).toHaveBeenCalledOnce();
		expect(fixture.renderedStatuses).toEqual(['initializing']);
	});

	it('debounces a burst of progress notifications into one controlled refresh', async () => {
		const fixture = lifecycleFixture('initializing');
		await fixture.view.onOpen();
		fixture.emit('initializing');
		vi.advanceTimersByTime(20);
		fixture.emit('initializing');
		vi.advanceTimersByTime(20);
		fixture.emit('degraded');

		vi.advanceTimersByTime(49);
		expect(fixture.renderedStatuses).toEqual(['initializing']);
		vi.advanceTimersByTime(1);
		expect(fixture.renderedStatuses).toEqual(['initializing', 'degraded']);
	});
});
