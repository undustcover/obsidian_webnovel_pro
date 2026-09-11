import { describe, expect, it, vi } from 'vitest';
import { createDefaultConsoleProject } from '../../src/console/config';
import { ConsoleApplication } from '../../src/console/application';
import { ConsoleIndexRuntime } from '../../src/console/indexing';
import { TFile } from '../mocks/obsidian';

function recoveryFixture() {
	const file = new TFile('人物.md', '作品/人物.md');
	file.stat = { mtime: 1 };
	const cache = new Map<string, string>();
	const project = { ...createDefaultConsoleProject('作品'), projectId: 'p1' };
	const adapter = {
		exists: vi.fn(async (path: string) => cache.has(path)),
		read: vi.fn(async (path: string) => cache.get(path) || ''),
		write: vi.fn(async (path: string, value: string) => { cache.set(path, value); }),
		remove: vi.fn(async (path: string) => { cache.delete(path); }),
	};
	const vault = {
		getMarkdownFiles: vi.fn(() => [file]),
		cachedRead: vi.fn(async () => '# 人物'),
		adapter,
	};
	const plugin = {
		manifest: { id: 'test-console', dir: 'plugins/test-console' },
		settings: { consoleProjects: [project] },
		app: {
			vault,
			metadataCache: { getFileCache: vi.fn(() => ({ frontmatter: { type: 'character', id: 'CHR-0001', title: '初始标题' } })) },
		},
	} as never;
	const runtime = new ConsoleIndexRuntime(plugin);
	const application = new ConsoleApplication(runtime, {} as never, {} as never, {} as never);
	return { runtime, application, vault, adapter, cache, file };
}

describe('Console index recovery', () => {
	it('retries the target scan and publishes an equivalent fresh snapshot', async () => {
		const fixture = recoveryFixture();
		await fixture.runtime.initialize();
		const previous = fixture.runtime.getIndex('p1')?.getSnapshot();

		const result = await fixture.application.retryIndex('p1');

		expect(result).toMatchObject({ projectId: 'p1', mode: 'retry', recordCount: 1 });
		expect(result.snapshotVersion).not.toBe(previous?.version);
		expect(fixture.runtime.getIndex('p1')?.getSnapshot()?.records.map(record => record.key)).toEqual(previous?.records.map(record => record.key));
		expect(fixture.adapter.remove).not.toHaveBeenCalled();
	});

	it('reports a scan failure while preserving the last published snapshot', async () => {
		const fixture = recoveryFixture();
		await fixture.runtime.initialize();
		const previous = fixture.runtime.getIndex('p1')?.getSnapshot();
		fixture.vault.cachedRead.mockRejectedValueOnce(new Error('scan failed'));

		await expect(fixture.application.retryIndex('p1')).rejects.toThrow('scan failed');

		expect(fixture.runtime.getIndex('p1')?.getSnapshot()).toBe(previous);
		expect(fixture.application.getIndexState()).toMatchObject({ status: 'error', code: 'INDEX_SCAN_FAILED', technicalDetail: 'scan failed' });
	});

	it('rebuilds only after the derived cache is removed', async () => {
		const fixture = recoveryFixture();
		await fixture.runtime.initialize();
		const cachePath = [...fixture.cache.keys()][0];
		fixture.cache.set(cachePath, '{broken cache');
		const events: string[] = [];
		fixture.adapter.remove.mockImplementationOnce(async (path: string) => { events.push('remove'); fixture.cache.delete(path); });
		fixture.vault.getMarkdownFiles.mockImplementationOnce(() => { events.push('scan'); return [fixture.file]; });

		const result = await fixture.application.rebuildIndex('p1');

		expect(result).toMatchObject({ projectId: 'p1', mode: 'rebuild', recordCount: 1 });
		expect(events).toEqual(['remove', 'scan']);
		expect(JSON.parse(fixture.cache.get(cachePath) || '')).toMatchObject({ projectId: 'p1', records: [{ key: 'CHR-0001' }] });
	});

	it('does not scan or replace the snapshot when cache deletion fails', async () => {
		const fixture = recoveryFixture();
		await fixture.runtime.initialize();
		const previous = fixture.runtime.getIndex('p1')?.getSnapshot();
		const scans = fixture.vault.getMarkdownFiles.mock.calls.length;
		fixture.adapter.remove.mockRejectedValueOnce(new Error('cache delete failed'));

		await expect(fixture.application.rebuildIndex('p1')).rejects.toThrow('cache delete failed');

		expect(fixture.vault.getMarkdownFiles).toHaveBeenCalledTimes(scans);
		expect(fixture.runtime.getIndex('p1')?.getSnapshot()).toBe(previous);
	});

	it('rejects unknown projects without touching cache or Markdown sources', async () => {
		const fixture = recoveryFixture();
		await expect(fixture.application.retryIndex('missing')).rejects.toThrow('CONSOLE_PROJECT_UNKNOWN: missing');
		await expect(fixture.application.rebuildIndex('missing')).rejects.toThrow('CONSOLE_PROJECT_UNKNOWN: missing');
		expect(fixture.adapter.remove).not.toHaveBeenCalled();
		expect(fixture.vault.cachedRead).not.toHaveBeenCalled();
	});
});
