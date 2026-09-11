import { Setting } from 'obsidian';
import type { Suggestion, SuggestionUiDecision } from '../application';

export function renderSuggestions(container: HTMLElement, suggestions: readonly Suggestion[], onDecision: (suggestion: Suggestion, decision: SuggestionUiDecision, task: { id: string; title: string } | undefined, button: HTMLButtonElement) => void): void {
	const section = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(section).setName(`建议 · ${suggestions.length}`).setHeading();
	if (!suggestions.length) { section.createDiv({ cls: 'webnovel-console__muted', text: '暂无待处理建议。' }); return; }
	for (const suggestion of suggestions) {
		const card = section.createDiv({ cls: 'webnovel-console__entity' });
		card.createEl('strong', { text: suggestion.message });
		card.createDiv({ text: `${suggestion.ruleId} · ${suggestion.targetKey} · ${suggestion.anchorId || '无锚点'}` });
		const taskId = card.createEl('input', { type: 'text', placeholder: 'TSK-0001', attr: { 'aria-label': '转换任务 ID' } });
		const taskTitle = card.createEl('input', { type: 'text', value: suggestion.message, attr: { 'aria-label': '转换任务标题' } });
		for (const [decision, label] of [['accept', '接受'], ['defer', '延后'], ['ignore', '忽略一次'], ['not_applicable', '不适用'], ['convert_to_task', '转为任务']] as const) {
			const button = card.createEl('button', { text: label, attr: { type: 'button' } });
			button.addEventListener('click', () => onDecision(suggestion, decision, decision === 'convert_to_task' ? { id: taskId.value.trim(), title: taskTitle.value.trim() } : undefined, button));
		}
	}
}
