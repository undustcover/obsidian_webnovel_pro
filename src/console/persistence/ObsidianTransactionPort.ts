import { TFile, TFolder, normalizePath } from 'obsidian';
import type { WebNovelAssistantPlugin } from '../../types/plugin';
import type { ConsoleIndexRuntime } from '../indexing';
import type { AuditStoragePort } from './AuditRepository';
import type { IndexRefreshPort, TransactionFileState, TransactionPort } from './TransactionExecutor';

export class ObsidianTransactionPort implements TransactionPort {
	constructor(private readonly plugin: WebNovelAssistantPlugin) {}

	async read(path: string): Promise<TransactionFileState | null> {
		const file = this.plugin.app.vault.getAbstractFileByPath(normalizePath(path));
		if (!(file instanceof TFile)) return null;
		return { mtime: file.stat.mtime, content: await this.plugin.app.vault.read(file) };
	}

	async create(path: string, content: string): Promise<void> {
		const normalized = normalizePath(path);
		await this.ensureParentFolders(normalized);
		await this.plugin.app.vault.create(normalized, content);
	}

	async modify(path: string, content: string): Promise<void> {
		const file = this.requireFile(path);
		await this.plugin.app.vault.modify(file, content);
	}

	async delete(path: string): Promise<void> {
		await this.plugin.app.fileManager.trashFile(this.requireFile(path));
	}

	async move(path: string, targetPath: string): Promise<void> {
		await this.plugin.app.fileManager.renameFile(this.requireFile(path), normalizePath(targetPath));
	}

	private requireFile(path: string): TFile {
		const file = this.plugin.app.vault.getAbstractFileByPath(normalizePath(path));
		if (!(file instanceof TFile)) throw new Error(`Markdown file not found: ${path}`);
		return file;
	}

	private async ensureParentFolders(path: string): Promise<void> {
		const parts = path.split('/').slice(0, -1);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.plugin.app.vault.getAbstractFileByPath(current);
			if (existing instanceof TFolder) continue;
			if (existing) throw new Error(`Vault parent path is not a folder: ${current}`);
			try { await this.plugin.app.vault.createFolder(current); }
			catch (error) {
				if (!(this.plugin.app.vault.getAbstractFileByPath(current) instanceof TFolder)) throw error;
			}
		}
	}
}

export class ObsidianIndexRefreshPort implements IndexRefreshPort {
	constructor(private readonly runtime: ConsoleIndexRuntime, private readonly timeoutMs = 5000) {}

	async waitForRefresh(_paths: readonly string[], snapshotBefore: string): Promise<string> {
		const refresh = this.runtime.refreshPaths(_paths);
		let timer: number | undefined;
		try {
			const version = await Promise.race([
				refresh,
				new Promise<never>((_resolve, reject) => { timer = window.setTimeout(() => reject(new Error('INDEX_REFRESH_TIMEOUT')), this.timeoutMs); }),
			]);
			if (version === snapshotBefore) throw new Error('INDEX_REFRESH_STALE');
			return version;
		} finally {
			if (timer !== undefined) window.clearTimeout(timer);
		}
	}
}

export function createObsidianAuditStorage(plugin: WebNovelAssistantPlugin, path: string): AuditStoragePort {
	const adapter = plugin.app.vault.adapter;
	return {
		read: async () => await adapter.exists(path) ? await adapter.read(path) : null,
		write: async content => { await adapter.write(path, content); },
	};
}
