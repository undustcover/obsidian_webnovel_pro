import { Setting } from 'obsidian';
import type { TimelineProjection, TimelineView } from '../application';

export function renderEventControlPage(container: HTMLElement, view: TimelineView, projection: TimelineProjection, onOpen: (key: string) => void): void {
	for (const warning of projection.warnings) container.createDiv({ cls: 'webnovel-console__warning', text: warning === 'CROSS_CALENDAR_NOT_COMPARABLE' ? '存在不同历法，未推测跨历法先后。' : '部分事件时间不可比较，使用时间轴顺序辅助展示。' });
	if (!projection.items.length) { container.createDiv({ cls: 'webnovel-console__empty', text: '此时间轴暂无事件。' }); return; }
	let group = '';
	for (const item of projection.items) {
		if (item.timeGroup !== group) { group = item.timeGroup; new Setting(container).setName(group === 'unmapped' ? '未映射时间' : group).setHeading(); }
		const card = container.createEl('button', { cls: 'webnovel-console__result', attr: { type: 'button' } });
		card.createEl('strong', { text: item.event.title });
		card.createDiv({ text: `${item.event.id || item.event.key} · ${item.data.eventStatus} / ${item.data.narrativeStatus} / ${item.data.readerState} · ${item.importance}` });
		card.addEventListener('click', () => onOpen(item.event.key));
	}
	container.dataset.timelineView = view;
}
