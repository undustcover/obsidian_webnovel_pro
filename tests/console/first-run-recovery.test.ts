import { describe, expect, it, vi } from 'vitest';
import { createFirstRunFixtures } from '../fixtures/console/first-run/generator';
import { createFirstRunRuntimeHarness } from '../fixtures/console/first-run/runtimeHarness';

const fixtures = Object.fromEntries(createFirstRunFixtures().map(fixture => [fixture.name, fixture]));

describe('P0-089C first-run timing and recovery', () => {
	it('supports an early-open subscriber and emits a final ready state once', async () => {
		const { runtime, application } = createFirstRunRuntimeHarness(fixtures['legacy-workspace']!);
		const states: string[] = [];
		const unsubscribe = application.subscribe(event => states.push(event.availability.status));

		await runtime.initialize();

		expect(states[0]).toBe('initializing');
		expect(states.at(-1)).toBe('ready');
		expect(states.filter(status => status === 'ready')).toHaveLength(1);
		unsubscribe();
		await application.retryIndex('project-1');
		expect(states.filter(status => status === 'ready')).toHaveLength(1);
	});

	it('ignores a corrupt derived cache and rebuilds a canonical snapshot from Markdown', async () => {
		const { runtime, application, cache } = createFirstRunRuntimeHarness(fixtures['legacy-workspace']!);
		cache.set('plugins/test-console/console-index-v1-project-1.json', '{broken');

		await runtime.initialize();

		expect(application.getIndexState()).toMatchObject({ status: 'ready', recordCount: 1 });
		expect(JSON.parse(cache.get('plugins/test-console/console-index-v1-project-1.json') || '')).toMatchObject({
			projectId: 'project-1', records: [{ key: 'CH-0001' }],
		});
	});

	it('recovers an initial scan failure through retry without reloading the runtime', async () => {
		const { runtime, application, vault } = createFirstRunRuntimeHarness(fixtures['legacy-workspace']!);
		vault.cachedRead.mockRejectedValueOnce(new Error('fixture scan failed'));

		await expect(runtime.initialize()).rejects.toThrow('fixture scan failed');
		expect(application.getIndexState()).toMatchObject({ status: 'error', code: 'INDEX_SCAN_FAILED', technicalDetail: 'fixture scan failed' });
		await application.retryIndex('project-1');
		expect(application.getIndexState()).toMatchObject({ status: 'ready', recordCount: 1 });
	});

	it('keeps a published snapshot usable during cache failure and clears degradation after retry', async () => {
		const { runtime, application, vault } = createFirstRunRuntimeHarness(fixtures['legacy-workspace']!);
		vault.adapter.write.mockRejectedValueOnce(new Error('disk full'));

		await runtime.initialize();
		expect(application.getIndexState()).toMatchObject({ status: 'degraded', code: 'INDEX_CACHE_WRITE_FAILED', recordCount: 1 });
		expect(application.search({ page: 1, pageSize: 10 }).items).toHaveLength(1);
		await application.retryIndex('project-1');
		expect(application.getIndexState()).toMatchObject({ status: 'ready', recordCount: 1 });
	});

	it('destroys listeners and ignores later notifications', async () => {
		const { runtime, application } = createFirstRunRuntimeHarness(fixtures['zero-file']!);
		const listener = vi.fn();
		application.subscribe(listener);
		await runtime.initialize();
		const calls = listener.mock.calls.length;

		runtime.destroy();
		await runtime.handleFileEvent({ type: 'delete', path: '空作品/不存在.md' });

		expect(listener).toHaveBeenCalledTimes(calls);
		expect(runtime.getProjectIds()).toEqual([]);
	});
});

