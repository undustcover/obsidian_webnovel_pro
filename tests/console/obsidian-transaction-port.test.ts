import { describe, expect, it, vi } from 'vitest';
import { TFile, TFolder } from 'obsidian';
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

	it('creates missing parent folders before a nested file', async () => {
		const entries = new Map<string, unknown>();
		const vault = {
			getAbstractFileByPath: vi.fn((path: string) => entries.get(path) || null),
			createFolder: vi.fn(async (path: string) => { entries.set(path, Object.assign(new TFolder(), { path })); }),
			create: vi.fn().mockResolvedValue(undefined), adapter: {},
		};
		const port = new ObsidianTransactionPort({ app: { vault, fileManager: {} } } as unknown as WebNovelAssistantPlugin);
		await port.create('作品/Codex上下文/current-context.md', 'content');
		expect(vault.createFolder.mock.calls.map(call => call[0])).toEqual(['作品', '作品/Codex上下文']);
		expect(vault.create).toHaveBeenCalledWith('作品/Codex上下文/current-context.md', 'content');
	});

	it('forces an affected-path refresh instead of accepting an unrelated snapshot', async () => {
		const refreshPaths = vi.fn().mockResolvedValue('s2');
		const refresh = new ObsidianIndexRefreshPort({ refreshPaths } as never);
		expect(await refresh.waitForRefresh(['作品/事件.md'], 's1')).toBe('s2');
		expect(refreshPaths).toHaveBeenCalledWith(['作品/事件.md']);
		refreshPaths.mockResolvedValueOnce('s1');
		await expect(refresh.waitForRefresh(['作品/事件.md'], 's1')).rejects.toThrow('INDEX_REFRESH_STALE');
	});

	it('creates plugin-data audit storage without touching Markdown', async () => {
		const adapter = { exists: vi.fn().mockResolvedValue(true), read: vi.fn().mockResolvedValue('{}'), write: vi.fn().mockResolvedValue(undefined) };
		const storage = createObsidianAuditStorage({ app: { vault: { adapter } } } as unknown as WebNovelAssistantPlugin, '.obsidian/plugins/x/audit.json');
		expect(await storage.read()).toBe('{}');
		await storage.write('next');
		expect(adapter.write).toHaveBeenCalledWith('.obsidian/plugins/x/audit.json', 'next');
	});
});
