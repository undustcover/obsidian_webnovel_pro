import { TFile, normalizePath } from 'obsidian';
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
		await this.plugin.app.vault.create(normalizePath(path), content);
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
}

export class ObsidianIndexRefreshPort implements IndexRefreshPort {
	constructor(private readonly runtime: ConsoleIndexRuntime, private readonly timeoutMs = 5000) {}

	async waitForRefresh(_paths: readonly string[], snapshotBefore: string): Promise<string> {
		const index = this.runtime.getIndex();
		if (!index) throw new Error('Console index is unavailable');
		const current = index.getSnapshot();
		if (current && current.version !== snapshotBefore) return current.version;
		return new Promise<string>((resolve, reject) => {
			let unsubscribe: () => void = () => undefined;
			const timer = window.setTimeout(() => {
				unsubscribe();
				reject(new Error('INDEX_REFRESH_TIMEOUT'));
			}, this.timeoutMs);
			unsubscribe = index.onSnapshot(snapshot => {
				if (snapshot.version === snapshotBefore) return;
				window.clearTimeout(timer);
				unsubscribe();
				resolve(snapshot.version);
			});
		});
	}
}

export function createObsidianAuditStorage(plugin: WebNovelAssistantPlugin, path: string): AuditStoragePort {
	const adapter = plugin.app.vault.adapter;
	return {
		read: async () => await adapter.exists(path) ? await adapter.read(path) : null,
		write: async content => { await adapter.write(path, content); },
	};
}
