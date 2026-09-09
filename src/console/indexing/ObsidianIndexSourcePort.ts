import type { TFile, App } from 'obsidian';
import type { AdapterSource } from '../adapters';
import type { ConsoleProjectConfig } from '../config';
import type { IndexSourcePort } from './EntityIndexService';
import { ProjectScopeResolver } from './ProjectScopeResolver';

export function hashIndexContent(content: string): string {
	let hash = 2166136261;
	for (let index = 0; index < content.length; index++) {
		hash ^= content.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}:${content.length}`;
}

export class ObsidianIndexSourcePort implements IndexSourcePort {
	constructor(private app: App, private scope = new ProjectScopeResolver()) {}

	async toSource(file: TFile): Promise<AdapterSource> {
		const content = await this.app.vault.cachedRead(file);
		const cache = this.app.metadataCache.getFileCache(file);
		return {
			path: file.path, basename: file.basename, mtime: file.stat.mtime,
			contentHash: hashIndexContent(content), content,
			frontmatter: cache?.frontmatter,
			headings: cache?.headings?.map((heading) => ({ heading: heading.heading, level: heading.level })),
		};
	}

	async listMarkdownFiles(project: ConsoleProjectConfig): Promise<AdapterSource[]> {
		const files = this.app.vault.getMarkdownFiles().filter((file) => this.scope.contains(project, file.path));
		return Promise.all(files.map((file) => this.toSource(file)));
	}
}
