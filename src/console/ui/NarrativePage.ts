import { Setting } from 'obsidian';
import type { NarrativeLevelResult } from '../application';

export function renderNarrativePage(container: HTMLElement, result: NarrativeLevelResult, emptyState: string, onSelect: (key: string) => void): void {
	for (const diagnostic of result.diagnostics) container.createDiv({ cls: 'webnovel-console__warning', text: diagnostic.message });
	if (!result.items.length) { container.createDiv({ cls: 'webnovel-console__empty', text: emptyState }); return; }
	for (const item of result.items) {
		const card = container.createDiv({ cls: 'webnovel-console__entity' });
		new Setting(card).setName(`${item.node.storyCode ? `${item.node.storyCode} · ` : ''}${item.node.title}`).setHeading();
		card.createDiv({ cls: 'webnovel-console__muted', text: item.ancestors.length ? item.ancestors.map(parent => parent.title).join(' › ') : '顶层' });
		const details = card.createEl('button', { text: '查看详情', attr: { type: 'button' } });
		details.addEventListener('click', () => onSelect(item.node.key));
	}
}
