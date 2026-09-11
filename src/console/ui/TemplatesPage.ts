import { Setting, TFile } from 'obsidian';
import type { EntityRecord } from '../domain';

export interface TemplatePageItem { title: string; path: string; source: 'console' | 'chapter-setting'; valid: boolean }

export function buildTemplatePageItems(records: readonly EntityRecord[], configuredPaths: readonly string[], resolve: (path: string) => boolean): TemplatePageItem[] {
	const items = new Map<string, TemplatePageItem>();
	for (const record of records.filter(record => record.type === 'template')) items.set(record.source.path, { title: record.title, path: record.source.path, source: 'console', valid: true });
	for (const path of configuredPaths) if (path && !items.has(path)) items.set(path, { title: path.split('/').pop()?.replace(/\.md$/i, '') || path, path, source: 'chapter-setting', valid: resolve(path) });
	return [...items.values()].sort((left, right) => left.title.localeCompare(right.title) || left.path.localeCompare(right.path));
}

export function renderTemplatesPage(container: HTMLElement, items: readonly TemplatePageItem[], onOpen: (path: string) => void, onCreate: () => void): void {
	container.createDiv({ cls: 'webnovel-console__notice', text: '模板页复用现有章节模板能力；P0 仅提供列表、原文与创建入口，不包含模板设计器。' });
	const create = container.createEl('button', { text: '使用现有流程创建章节', attr: { type: 'button' } });
	create.addEventListener('click', onCreate);
	if (!items.length) { container.createDiv({ cls: 'webnovel-console__empty', text: '暂无有效模板。' }); return; }
	for (const item of items) {
		const card = container.createDiv({ cls: 'webnovel-console__entity' });
		new Setting(card).setName(item.title).setHeading();
		card.createDiv({ text: `${item.path} · ${item.source === 'console' ? '规范模板' : '章节模板设置'}${item.valid ? '' : ' · 路径不可用'}` });
		const open = card.createEl('button', { text: '打开原文', attr: { type: 'button' } });
		open.disabled = !item.valid;
		open.addEventListener('click', () => onOpen(item.path));
	}
}

export function isMarkdownTemplateFile(value: unknown): boolean { return value instanceof TFile && value.extension === 'md'; }
