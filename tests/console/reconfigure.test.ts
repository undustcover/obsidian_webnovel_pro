import { describe, expect, it, vi } from 'vitest';
import { createDefaultConsoleProject } from '../../src/console/config';
import { ConsoleIndexRuntime } from '../../src/console/indexing';
import { TFile } from '../mocks/obsidian';

const makeProject = (id: string, root: string, index = 0) => ({
	...createDefaultConsoleProject(root, index),
	projectId: id,
});

function runtimeFixture() {
	const a = new TFile('a.md', '作品一/a.md');
	const b = new TFile('b.md', '作品二/b.md');
	a.stat = { mtime: 1 };
	b.stat = { mtime: 1 };
	const files = [a, b];
	const frontmatter = new Map<string, Record<string, unknown>>([
		[a.path, { type: 'character', id: 'CHR-0001', title: '项目一' }],
		[b.path, { type: 'event', id: 'EVT-0001', title: '项目二' }],
	]);
	const cache = new Map<string, string>();
	const plugin = {
		manifest: { id: 'test-console', dir: 'plugins/test-console' },
		settings: { consoleProjects: [makeProject('p1', '作品一'), makeProject('p2', '作品二', 1)] },
		app: {
			vault: {
				getMarkdownFiles: vi.fn(() => [...files]),
				cachedRead: vi.fn(async (file: TFile) => `# ${file.basename}`),
				adapter: {
					exists: vi.fn(async (path: string) => cache.has(path)),
					read: vi.fn(async (path: string) => cache.get(path) || ''),
					write: vi.fn(async (path: string, value: string) => { cache.set(path, value); }),
					remove: vi.fn(async (path: string) => { cache.delete(path); }),
				},
			},
			metadataCache: { getFileCache: vi.fn((file: TFile) => ({ frontmatter: frontmatter.get(file.path) })) },
		},
	} as never;
	return { runtime: new ConsoleIndexRuntime(plugin), files, frontmatter, plugin };
}

describe('ConsoleIndexRuntime reconfigure', () => {
	it('atomically adds, removes and changes roots while preserving a valid active project', async () => {
		const fixture = runtimeFixture();
		await fixture.runtime.initialize();
		expect(fixture.runtime.setActiveProject('p2')).toBe(true);
		const oldP2 = fixture.runtime.getIndex('p2');
		const result = await fixture.runtime.reconfigure([makeProject('p2', '作品一'), makeProject('p3', '作品二', 2)]);
		expect(result).toEqual({ projectIds: ['p2', 'p3'], activeProjectId: 'p2' });
		expect(fixture.runtime.getIndex('p1')).toBeUndefined();
		expect(fixture.runtime.getIndex('p2')).not.toBe(oldP2);
		expect(fixture.runtime.getIndex('p2')?.getSnapshot()?.records[0]?.title).toBe('项目一');
		expect(fixture.runtime.getIndex('p3')?.getSnapshot()?.records[0]?.title).toBe('项目二');
	});

	it('rejects duplicate configuration before replacing the old context and snapshot', async () => {
		const fixture = runtimeFixture();
		await fixture.runtime.initialize();
		const oldIndex = fixture.runtime.getIndex('p1');
		const oldSnapshot = oldIndex?.getSnapshot();
		await expect(fixture.runtime.reconfigure([makeProject('same', '作品一'), makeProject('same', '作品二', 1)])).rejects.toThrow('CONFIG_DUPLICATE_PROJECT_ID');
		expect(fixture.runtime.getIndex('p1')).toBe(oldIndex);
		expect(fixture.runtime.getIndex('p1')?.getSnapshot()).toBe(oldSnapshot);
	});

	it('keeps the old context when a candidate scan fails', async () => {
		const fixture = runtimeFixture();
		await fixture.runtime.initialize();
		const oldIndex = fixture.runtime.getIndex('p1');
		(fixture.plugin as unknown as { app: { vault: { cachedRead: ReturnType<typeof vi.fn> } } }).app.vault.cachedRead.mockRejectedValueOnce(new Error('scan failed'));
		await expect(fixture.runtime.reconfigure([makeProject('p3', '作品一')])).rejects.toThrow('scan failed');
		expect(fixture.runtime.getProjectIds()).toEqual(['p1', 'p2']);
		expect(fixture.runtime.getIndex('p1')).toBe(oldIndex);
	});

	it('can atomically become unconfigured and falls back to the first project when active is removed', async () => {
		const fixture = runtimeFixture();
		await fixture.runtime.initialize();
		fixture.runtime.setActiveProject('p2');
		expect(await fixture.runtime.reconfigure([makeProject('p1', '作品一')])).toEqual({ projectIds: ['p1'], activeProjectId: 'p1' });
		expect(await fixture.runtime.reconfigure([])).toEqual({ projectIds: [], activeProjectId: undefined });
	});
});
