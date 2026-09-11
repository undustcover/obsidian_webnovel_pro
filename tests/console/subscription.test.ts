import { describe, expect, it, vi } from 'vitest';
import { ConsoleApplication, type ConsoleApplicationEvent } from '../../src/console/application';
import { createDefaultConsoleProject } from '../../src/console/config';
import { ConsoleIndexRuntime, type ConsoleRuntimeEvent } from '../../src/console/indexing';
import { TFile } from '../mocks/obsidian';

const project = (projectId: string, root: string, index: number) => ({
	...createDefaultConsoleProject(root, index),
	projectId,
});

function subscriptionFixture() {
	const first = new TFile('人物.md', '作品一/人物.md');
	const second = new TFile('事件.md', '作品二/事件.md');
	first.stat = { mtime: 1 };
	second.stat = { mtime: 1 };
	const cache = new Map<string, string>();
	const frontmatter = new Map([
		[first.path, { type: 'character', id: 'CHR-0001', title: '人物' }],
		[second.path, { type: 'event', id: 'EVT-0001', title: '事件' }],
	]);
	const adapter = {
		exists: vi.fn(async (path: string) => cache.has(path)),
		read: vi.fn(async (path: string) => cache.get(path) || ''),
		write: vi.fn(async (path: string, value: string) => { cache.set(path, value); }),
		remove: vi.fn(async (path: string) => { cache.delete(path); }),
	};
	const plugin = {
		manifest: { id: 'test-console', dir: 'plugins/test-console' },
		settings: { consoleProjects: [project('p1', '作品一', 0), project('p2', '作品二', 1)] },
		app: {
			vault: {
				getMarkdownFiles: vi.fn(() => [first, second]),
				cachedRead: vi.fn(async (file: TFile) => `# ${file.basename}`),
				adapter,
			},
			metadataCache: { getFileCache: vi.fn((file: TFile) => ({ frontmatter: frontmatter.get(file.path) })) },
		},
	} as never;
	const runtime = new ConsoleIndexRuntime(plugin);
	const application = new ConsoleApplication(runtime, {} as never, {} as never, {} as never);
	return { runtime, application, adapter };
}

describe('Console unified subscription', () => {
	it('orders initialization events and emits one final ready notification', async () => {
		const { runtime, application } = subscriptionFixture();
		const events: ConsoleApplicationEvent[] = [];
		application.subscribe(event => events.push(event));

		await runtime.initialize();

		expect(events[0]).toMatchObject({ reason: 'current', activeProjectId: 'p1', availability: { status: 'initializing' } });
		expect(events.at(-1)).toMatchObject({ projectId: 'p1', availability: { status: 'ready', projectId: 'p1', recordCount: 1 } });
		expect(events.filter(event => event.availability.status === 'ready')).toHaveLength(1);
		expect(events.map(event => event.sequence)).toEqual([...events.map(event => event.sequence)].sort((left, right) => left - right));
	});

	it('returns an unsubscribe function that stops all later notifications', async () => {
		const { runtime, application } = subscriptionFixture();
		const listener = vi.fn();
		const unsubscribe = application.subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		await runtime.initialize();
		runtime.setActiveProject('p2');

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('waits for cache persistence before publishing the final availability', async () => {
		const { runtime, application, adapter } = subscriptionFixture();
		adapter.write.mockRejectedValueOnce(new Error('cache write failed'));
		const events: ConsoleApplicationEvent[] = [];
		application.subscribe(event => events.push(event));

		await runtime.initialize();

		expect(events.some(event => event.availability.status === 'ready')).toBe(false);
		expect(events.at(-1)).toMatchObject({ reason: 'cache', projectId: 'p1', availability: { status: 'degraded', code: 'INDEX_CACHE_WRITE_FAILED' } });
	});

	it('isolates inactive project index changes until that project becomes active', async () => {
		const { runtime, application } = subscriptionFixture();
		const events: ConsoleApplicationEvent[] = [];
		application.subscribe(event => events.push(event));
		await runtime.initialize();
		const beforeInactiveRetry = events.length;

		await runtime.retry('p2');
		expect(events).toHaveLength(beforeInactiveRetry);

		runtime.setActiveProject('p2');
		expect(events.at(-1)).toMatchObject({ reason: 'active-project', projectId: 'p2', availability: { status: 'ready', projectId: 'p2' } });
	});

	it('publishes one atomic configuration event after candidate contexts are ready', async () => {
		const { runtime, application } = subscriptionFixture();
		await runtime.initialize();
		const events: ConsoleApplicationEvent[] = [];
		application.subscribe(event => events.push(event));

		await runtime.reconfigure([project('p1', '作品一', 0)]);

		const configurationEvents = events.filter(event => event.reason === 'configuration');
		expect(configurationEvents).toHaveLength(1);
		expect(configurationEvents[0]).toMatchObject({ projectIds: ['p1'], activeProjectId: 'p1', availability: { status: 'ready' } });
	});

	it('exposes cloned state and snapshot summaries instead of mutable index maps', async () => {
		const { runtime } = subscriptionFixture();
		const events: ConsoleRuntimeEvent[] = [];
		runtime.subscribe(event => events.push(event));
		await runtime.initialize();

		const snapshotEvent = events.find(event => event.change === 'snapshot' && event.projectId === 'p1');
		expect(snapshotEvent?.snapshot).toEqual(expect.objectContaining({ projectId: 'p1', recordCount: 1 }));
		expect(Object.isFrozen(snapshotEvent?.snapshot)).toBe(true);
		expect(Object.isFrozen(snapshotEvent)).toBe(true);
		expect(Object.isFrozen(snapshotEvent?.state)).toBe(true);
		expect(snapshotEvent?.snapshot).not.toHaveProperty('records');
		expect(snapshotEvent?.snapshot).not.toHaveProperty('byKey');
		expect(snapshotEvent?.projectIds).not.toBe(runtime.getProjectIds());
	});
});
