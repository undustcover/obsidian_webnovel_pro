import { describe, expect, it, vi } from 'vitest';
import { TFile } from 'obsidian';
import { ObsidianIndexRefreshPort, ObsidianTransactionPort, createObsidianAuditStorage } from '../../src/console/persistence';
import type { WebNovelAssistantPlugin } from '../../src/types/plugin';

const makeFile = (path: string, mtime = 1) => Object.assign(new TFile(), { path, name: path.split('/').pop(), stat: { mtime } });

describe('Obsidian transaction adapters', () => {
	it('maps read/create/modify/trash/move to Vault and FileManager APIs', async () => {
		const file = makeFile('a.md', 7);
		const vault = {
			getAbstractFileByPath: vi.fn().mockReturnValue(file), read: vi.fn().mockResolvedValue('body'),
			create: vi.fn().mockResolvedValue(undefined), modify: vi.fn().mockResolvedValue(undefined),
			adapter: {},
		};
		const fileManager = { trashFile: vi.fn().mockResolvedValue(undefined), renameFile: vi.fn().mockResolvedValue(undefined) };
		const port = new ObsidianTransactionPort({ app: { vault, fileManager } } as unknown as WebNovelAssistantPlugin);
		expect(await port.read('a.md')).toEqual({ mtime: 7, content: 'body' });
		await port.create('new.md', 'new');
		await port.modify('a.md', 'next');
		await port.delete('a.md');
		await port.move('a.md', 'folder/a.md');
		expect(vault.create).toHaveBeenCalledWith('new.md', 'new');
		expect(vault.modify).toHaveBeenCalledWith(file, 'next');
		expect(fileManager.trashFile).toHaveBeenCalledWith(file);
		expect(fileManager.renameFile).toHaveBeenCalledWith(file, 'folder/a.md');
	});

	it('returns null for missing files and rejects mutations of missing files', async () => {
		const plugin = { app: { vault: { getAbstractFileByPath: vi.fn(), adapter: {} }, fileManager: {} } } as unknown as WebNovelAssistantPlugin;
		const port = new ObsidianTransactionPort(plugin);
		expect(await port.read('missing.md')).toBeNull();
		await expect(port.modify('missing.md', 'x')).rejects.toThrow('not found');
	});

	it('waits for a newer immutable snapshot, or returns one already published', async () => {
		let listener!: (snapshot: { version: string }) => void;
		const index = { getSnapshot: vi.fn().mockReturnValue({ version: 's2' }), onSnapshot: vi.fn((cb: typeof listener) => { listener = cb; return vi.fn(); }) };
		const refresh = new ObsidianIndexRefreshPort({ getIndex: () => index } as never);
		expect(await refresh.waitForRefresh([], 's1')).toBe('s2');
		index.getSnapshot.mockReturnValue({ version: 's1' });
		const waiting = refresh.waitForRefresh([], 's1');
		listener({ version: 's2' });
		expect(await waiting).toBe('s2');
	});

	it('creates plugin-data audit storage without touching Markdown', async () => {
		const adapter = { exists: vi.fn().mockResolvedValue(true), read: vi.fn().mockResolvedValue('{}'), write: vi.fn().mockResolvedValue(undefined) };
		const storage = createObsidianAuditStorage({ app: { vault: { adapter } } } as unknown as WebNovelAssistantPlugin, '.obsidian/plugins/x/audit.json');
		expect(await storage.read()).toBe('{}');
		await storage.write('next');
		expect(adapter.write).toHaveBeenCalledWith('.obsidian/plugins/x/audit.json', 'next');
	});
});
