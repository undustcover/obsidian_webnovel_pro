import { Setting } from 'obsidian';
import type { DashboardModel } from '../application';

export const DASHBOARD_ACTION_SECTIONS = [['now', '现在'], ['missed', '遗漏'], ['upcoming', '即将'], ['later', '稍后']] as const;

export function renderDashboardPage(container: HTMLElement, model: DashboardModel): void {
	if (!model.configured) container.createDiv({ cls: 'webnovel-console__empty', text: '尚未配置当前阶段；请先预览并创建当前阶段文件。' });
	const focus = container.createDiv({ cls: 'webnovel-console__dashboard-card' });
	new Setting(focus).setName('当前焦点').setHeading();
	focus.createDiv({ text: model.currentFocus || '未设置' });
	if (model.chapterWorkspace?.chapter) focus.createDiv({ text: `${model.chapterWorkspace.chapter.title} · ${model.chapterWorkspace.chapter.source.path}` });
	const cursors = container.createDiv({ cls: 'webnovel-console__dashboard-card' });
	new Setting(cursors).setName('故事线游标').setHeading();
	const entries = Object.entries(model.storylineCursors);
	if (!entries.length) cursors.createDiv({ text: '暂无游标' });
	for (const [name, eventId] of entries) cursors.createDiv({ text: `${name}：${eventId}` });
	for (const [key, title] of DASHBOARD_ACTION_SECTIONS) {
		const card = container.createDiv({ cls: 'webnovel-console__dashboard-card' });
		new Setting(card).setName(title).setHeading();
		card.createDiv({ text: model.actionGroups[key].join('；') || '暂无行动项' });
	}
	container.createDiv({ cls: 'webnovel-console__status', text: `索引：${model.indexStatus} · 健康问题：${model.healthCount}` });
}
