import { vi } from 'vitest';
import { ConsoleApplication } from '../../../../src/console/application';
import { ConsoleIndexRuntime } from '../../../../src/console/indexing';
import { TFile } from '../../../mocks/obsidian';
import type { FirstRunFixture } from './generator';

export function createFirstRunRuntimeHarness(fixture: FirstRunFixture) {
	const entries = new Map(fixture.files.map(entry => [entry.path, structuredClone(entry)]));
	const files = fixture.files.map(entry => {
		const name = entry.path.split('/').at(-1) || entry.path;
		const file = new TFile(name, entry.path);
		file.stat = { mtime: 1 };
		return file;
	});
	const cache = new Map<string, string>();
	const vault = {
		getMarkdownFiles: vi.fn(() => [...files]),
		cachedRead: vi.fn(async (file: TFile) => entries.get(file.path)?.content || ''),
		adapter: {
			exists: vi.fn(async (path: string) => cache.has(path)),
			read: vi.fn(async (path: string) => cache.get(path) || ''),
			write: vi.fn(async (path: string, value: string) => { cache.set(path, value); }),
			remove: vi.fn(async (path: string) => { cache.delete(path); }),
		},
	};
	const metadataCache = {
		getFileCache: vi.fn((file: TFile) => ({ frontmatter: entries.get(file.path)?.frontmatter })),
	};
	const plugin = {
		manifest: { id: 'test-console', dir: 'plugins/test-console' },
		settings: structuredClone(fixture.settings),
		app: { vault, metadataCache },
	};
	const runtime = new ConsoleIndexRuntime(plugin as never);
	const application = new ConsoleApplication(runtime, {} as never, {} as never, {} as never);
	return { runtime, application, plugin, vault, metadataCache, cache, files, entries };
}

