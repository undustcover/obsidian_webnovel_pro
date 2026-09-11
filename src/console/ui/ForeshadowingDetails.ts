import { Setting } from 'obsidian';
import type { EntityRecord } from '../domain';
import type { DiagnosticRef } from '../domain';
import type { ForeshadowingPatch } from '../persistence';

const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const text = (value: unknown): string => typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);
export function renderForeshadowingDetails(container: HTMLElement, model: { record: EntityRecord; writable: boolean; diagnostics: readonly DiagnosticRef[] }, onUpdate: (patch: ForeshadowingPatch, button: HTMLButtonElement) => void): void {
	const fields = [['truth_event_ids', '事实事件'], ['plant_before', '埋设锚点'], ['advance_when', '推进锚点'], ['reveal_after', '揭示锚点']] as const;
	for (const [field, label] of fields) container.createDiv({ text: `${label}：${list(model.record.data[field]).join(', ') || '无'}` });
	for (const diagnostic of model.diagnostics) container.createDiv({ cls: 'webnovel-console__warning', text: `${diagnostic.message} · ${text(diagnostic.evidence[0]?.value)}` });
	if (!model.writable) { container.createDiv({ cls: 'webnovel-console__notice', text: 'Legacy 伏笔只读，不自动升级或裁决事实。' }); return; }
	const form = container.createEl('form', { cls: 'webnovel-console__section', attr: { 'aria-label': '更新伏笔锚点' } });
	new Setting(form).setName('伏笔锚点与状态').setHeading();
	const inputs = Object.fromEntries(fields.map(([field, label]) => [field, form.createEl('input', { type: 'text', value: list(model.record.data[field]).join(', '), attr: { 'aria-label': label } })])) as Record<typeof fields[number][0], HTMLInputElement>;
	const status = form.createEl('select', { attr: { 'aria-label': '伏笔状态' } });
	for (const value of ['planned', 'planted', 'advanced', 'revealed', 'abandoned'] as const) status.createEl('option', { value, text: value }); status.value = typeof model.record.data.status === 'string' ? model.record.data.status : 'planned';
	const submit = form.createEl('button', { text: '预览伏笔修改', attr: { type: 'submit' } });
	form.addEventListener('submit', event => { event.preventDefault(); const parse = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean); onUpdate({ truth_event_ids: parse(inputs.truth_event_ids.value), plant_before: parse(inputs.plant_before.value), advance_when: parse(inputs.advance_when.value), reveal_after: parse(inputs.reveal_after.value), status: status.value as ForeshadowingPatch['status'] }, submit); });
}
