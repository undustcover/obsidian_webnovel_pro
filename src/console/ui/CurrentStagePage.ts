import { Setting } from 'obsidian';
import type { EntityRecord } from '../domain';
import type { ProjectState } from '../persistence';

export interface CursorTarget { id: string; title: string; storyline: string }
export interface CurrentStagePageOptions {
	state: ProjectState | null;
	focusCandidates: readonly EntityRecord[];
	cursorTargets: readonly CursorTarget[];
	onSaveFocus(update: { currentFocus: string | null; storylineCursors: Record<string, string> }, button: HTMLButtonElement): void;
	onAdvanceCursor(storyline: string, eventId: string, button: HTMLButtonElement): void;
}

export function renderCurrentStagePage(container: HTMLElement, options: CurrentStagePageOptions): void {
	const state = options.state;
	container.createDiv({ cls: 'webnovel-console__summary', text: state ? `当前焦点：${state.currentFocus || '未设置'}` : '当前阶段尚未配置。' });
	const form = container.createEl('form', { cls: 'webnovel-console__section', attr: { 'aria-label': state ? '编辑当前焦点' : '创建当前阶段' } });
	new Setting(form).setName(state ? '设置唯一焦点' : '首次创建当前阶段').setHeading();
	const select = form.createEl('select', { attr: { 'aria-label': '当前焦点' } });
	if (state) select.createEl('option', { value: '', text: '清除当前焦点' });
	for (const candidate of options.focusCandidates) select.createEl('option', { value: candidate.id!, text: `${candidate.title} · ${candidate.id}` });
	if (state?.currentFocus) select.value = state.currentFocus;
	const submit = form.createEl('button', { text: state ? '预览焦点修改' : '预览创建', attr: { type: 'submit' } });
	submit.disabled = !state && !options.focusCandidates.length;
	form.addEventListener('submit', event => { event.preventDefault(); if (state || select.value) options.onSaveFocus({ currentFocus: select.value || null, storylineCursors: { ...(state?.storylineCursors || {}) } }, submit); });
	if (!options.focusCandidates.length) form.createDiv({ cls: 'webnovel-console__empty', text: '没有可设为焦点的正式 ID 实体。' });
	if (!state) return;

	const byStoryline = new Map<string, CursorTarget[]>();
	for (const target of options.cursorTargets) { const entries = byStoryline.get(target.storyline) || []; entries.push(target); byStoryline.set(target.storyline, entries); }
	const cursorSection = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(cursorSection).setName('故事线游标').setHeading();
	if (!byStoryline.size) cursorSection.createDiv({ cls: 'webnovel-console__empty', text: '没有带故事线的事件。' });
	for (const [storyline, targets] of byStoryline) {
		const row = cursorSection.createDiv({ cls: 'webnovel-console__actions' });
		row.createSpan({ text: `${storyline}：${state.storylineCursors[storyline] || '未设置'}` });
		const target = row.createEl('select', { attr: { 'aria-label': `${storyline}目标事件` } });
		for (const event of targets) target.createEl('option', { value: event.id, text: `${event.title} · ${event.id}` });
		const advance = row.createEl('button', { text: '预览推进', attr: { type: 'button' } });
		advance.addEventListener('click', () => options.onAdvanceCursor(storyline, target.value, advance));
	}
}
