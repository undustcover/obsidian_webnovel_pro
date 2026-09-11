import { Setting } from 'obsidian';
import { TASK_STATUSES, type CreativeTaskData, type CreativeTaskStatus } from '../domain';
import type { DashboardModel } from '../application';

export interface TaskCreateDraft { id: string; title: string; anchorId: string; anchorType: 'event' | 'milestone' }
export const taskDataFromDraft = (draft: TaskCreateDraft): CreativeTaskData => ({ taskKind: 'writing', status: 'planned', priority: 'normal', relatedObjectIds: [draft.anchorId], activation: { relation: 'at', anchorType: draft.anchorType, anchorId: draft.anchorId }, blockedByIds: [] });

export interface CurrentTasksPageOptions {
	dashboard: DashboardModel;
	anchors: readonly { id: string; title: string; type: 'event' | 'milestone' }[];
	writableTaskIds: ReadonlySet<string>;
	taskStatuses?: ReadonlyMap<string, CreativeTaskStatus>;
	onCreate(draft: TaskCreateDraft, button: HTMLButtonElement): void;
	onStatus(taskId: string, status: CreativeTaskStatus, button: HTMLButtonElement): void;
	onOpen(key: string): void;
}

export function renderCurrentTasksPage(container: HTMLElement, options: CurrentTasksPageOptions): void {
	const form = container.createEl('form', { cls: 'webnovel-console__section', attr: { 'aria-label': '创建创作任务' } });
	new Setting(form).setName('创建创作任务').setHeading();
	const id = form.createEl('input', { type: 'text', placeholder: 'TSK-0001', attr: { 'aria-label': '任务 ID' } });
	const title = form.createEl('input', { type: 'text', placeholder: '任务标题', attr: { 'aria-label': '任务标题' } });
	const anchor = form.createEl('select', { attr: { 'aria-label': '激活锚点' } });
	for (const item of options.anchors) anchor.createEl('option', { value: `${item.type}:${item.id}`, text: `${item.title} · ${item.id}` });
	const create = form.createEl('button', { text: '预览创建', attr: { type: 'submit' } }); create.disabled = !options.anchors.length;
	form.addEventListener('submit', event => { event.preventDefault(); const [anchorType, anchorId] = anchor.value.split(':') as ['event' | 'milestone', string]; onValid(() => options.onCreate({ id: id.value.trim(), title: title.value.trim(), anchorId, anchorType }, create)); });

	for (const [group, items] of Object.entries(options.dashboard.actionGroups)) {
		const section = container.createDiv({ cls: 'webnovel-console__section' });
		new Setting(section).setName(`${group} · ${items.length}`).setHeading();
		if (!items.length) section.createDiv({ cls: 'webnovel-console__muted', text: '无' });
		for (const item of items) {
			const card = section.createDiv({ cls: 'webnovel-console__entity' });
			card.createEl('strong', { text: item.title });
			card.createDiv({ text: `${item.source} · ${item.reason} · 锚点 ${item.anchorIds.join(', ') || '无'}` });
			const open = card.createEl('button', { text: '打开来源', attr: { type: 'button' } }); open.addEventListener('click', () => options.onOpen(item.key));
			if (!options.writableTaskIds.has(item.key)) { card.createDiv({ cls: 'webnovel-console__notice', text: 'Legacy 任务只读，不自动升级。' }); continue; }
			const status = card.createEl('select', { attr: { 'aria-label': `${item.title}状态` } }); for (const value of TASK_STATUSES) status.createEl('option', { value, text: value }); status.value = options.taskStatuses?.get(item.key) || 'planned';
			const update = card.createEl('button', { text: '预览状态修改', attr: { type: 'button' } }); update.addEventListener('click', () => options.onStatus(item.key, status.value as CreativeTaskStatus, update));
		}
	}
}

const onValid = (callback: () => void): void => callback();
