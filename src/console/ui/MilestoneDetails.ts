import { Setting } from 'obsidian';
import { MILESTONE_STATUSES, type EntityRecord, type MilestoneData, type MilestoneEvaluation, type MilestoneStatus } from '../domain';

export function renderMilestoneDetails(container: HTMLElement, model: { record: EntityRecord; data: MilestoneData; evaluation: MilestoneEvaluation }, onProgress: (status: MilestoneStatus, button: HTMLButtonElement) => void): void {
	new Setting(container).setName('里程碑条件').setHeading();
	container.createDiv({ text: `状态：${model.data.status} · 故事线：${model.data.storyline || '未设置'} · 模式：${model.data.completion.mode}` });
	container.createDiv({ text: `条件事件：${model.data.completion.requiredEventIds.join(', ') || '无'} · 求值：${model.evaluation}` });
	const row = container.createDiv({ cls: 'webnovel-console__actions' });
	const status = row.createEl('select', { attr: { 'aria-label': '里程碑目标状态' } }); for (const value of MILESTONE_STATUSES) status.createEl('option', { value, text: value }); if (model.data.status !== 'unknown') status.value = model.data.status;
	const button = row.createEl('button', { text: '预览里程碑推进', attr: { type: 'button' } }); button.addEventListener('click', () => onProgress(status.value as MilestoneStatus, button));
}
