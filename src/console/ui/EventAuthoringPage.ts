import { Setting } from 'obsidian';
import type { EventData } from '../domain';

export interface EventCreateDraft { id: string; title: string; storyline: string }

export function createEventData(draft: EventCreateDraft): EventData {
	return {
		eventStatus: 'planned', narrativeStatus: 'unassigned', readerState: 'unknown', storyline: draft.storyline.trim(),
		prerequisiteEventIds: [], currentPlanIds: [], currentChapterIds: [], characterIds: [], organizationIds: [], locationIds: [], itemIds: [],
		timelineViews: { reality: { visible: true, importance: 'normal' }, characters: {}, organizations: {} },
		knowledgeState: { author: 'full', reader: 'unknown', povCharacters: {} }, causes: [], results: [], longTermImpacts: [], evidenceFiles: [],
	};
}

export function renderEventCreateForm(container: HTMLElement, onCreate: (draft: EventCreateDraft, button: HTMLButtonElement) => void): void {
	const form = container.createEl('form', { cls: 'webnovel-console__section', attr: { 'aria-label': '创建事件' } });
	new Setting(form).setName('创建事件').setHeading();
	const id = form.createEl('input', { type: 'text', placeholder: 'EVT-0001', attr: { 'aria-label': '事件 ID', pattern: 'EVT-[0-9]{4,}' } });
	const title = form.createEl('input', { type: 'text', placeholder: '事件标题', attr: { 'aria-label': '事件标题', required: 'true' } });
	const storyline = form.createEl('input', { type: 'text', placeholder: '主线', attr: { 'aria-label': '故事线', required: 'true' } });
	const submit = form.createEl('button', { text: '预览创建', attr: { type: 'submit' } });
	form.addEventListener('submit', event => { event.preventDefault(); onCreate({ id: id.value.trim(), title: title.value.trim(), storyline: storyline.value.trim() }, submit); });
}

export function renderEventFieldEditor(container: HTMLElement, data: EventData, onSave: (patch: Pick<EventData, 'storyline' | 'timelineOrder'>, button: HTMLButtonElement) => void): void {
	const form = container.createEl('form', { cls: 'webnovel-console__section', attr: { 'aria-label': '编辑事件允许字段' } });
	new Setting(form).setName('事件字段').setHeading();
	const storyline = form.createEl('input', { type: 'text', value: data.storyline, attr: { 'aria-label': '故事线' } });
	const order = form.createEl('input', { type: 'number', value: data.timelineOrder === undefined ? '' : String(data.timelineOrder), attr: { 'aria-label': '时间轴顺序' } });
	const submit = form.createEl('button', { text: '预览字段修改', attr: { type: 'submit' } });
	form.addEventListener('submit', event => { event.preventDefault(); const number = order.value.trim() ? Number(order.value) : undefined; onSave({ storyline: storyline.value.trim(), timelineOrder: Number.isFinite(number) ? number : undefined }, submit); });
}
