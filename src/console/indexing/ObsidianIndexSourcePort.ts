import { parseYaml, type TFile, type App } from 'obsidian';
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

function frontmatterFromContent(content: string): Record<string, unknown> | undefined {
	const match = content.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
	if (!match) return undefined;
	try {
		const parsed: unknown = parseYaml(match[1]);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
	} catch {
		return undefined;
	}
}

export class ObsidianIndexSourcePort implements IndexSourcePort {
	constructor(private app: App, private scope = new ProjectScopeResolver()) {}

	async toSource(file: TFile): Promise<AdapterSource> {
		const content = await this.app.vault.cachedRead(file);
		const cache = this.app.metadataCache.getFileCache(file);
		return {
			path: file.path, basename: file.basename, mtime: file.stat.mtime,
			contentHash: hashIndexContent(content), content,
			// Vault create/modify events can precede MetadataCache. Parse the content first so
			// transaction-triggered refreshes cannot publish an empty or stale contribution.
			frontmatter: frontmatterFromContent(content) ?? cache?.frontmatter,
			headings: cache?.headings?.map((heading) => ({ heading: heading.heading, level: heading.level })),
		};
	}

	async listMarkdownFiles(project: ConsoleProjectConfig): Promise<AdapterSource[]> {
		const files = this.app.vault.getMarkdownFiles().filter((file) => this.scope.contains(project, file.path));
		return Promise.all(files.map((file) => this.toSource(file)));
	}
}

export { frontmatterFromContent };
