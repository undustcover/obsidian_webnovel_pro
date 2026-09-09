import { Setting } from 'obsidian';
import type { ContextItem, ContextPlan } from '../domain';

export type ContextInclusionChange = (key: string, inclusion: ContextItem['inclusion']) => void;

const label = (value: ContextItem['inclusion']): string => ({
	auto_included: '自动纳入', manual_included: '手动纳入', manual_excluded: '手动排除',
})[value];

export function withContextInclusion(plan: ContextPlan, key: string, inclusion: ContextItem['inclusion']): ContextPlan {
	return { ...plan, items: plan.items.map(item => item.key === key ? { ...item, inclusion } : item) };
}

export function renderContextPage(container: HTMLElement, plan: ContextPlan, onChange?: ContextInclusionChange): void {
	container.createDiv({ cls: 'webnovel-console__context-target', text: `目标：${plan.target.key} · ${plan.items.length} 项` });
	for (const conflict of plan.conflicts) container.createDiv({ cls: 'webnovel-console__warning', text: conflict });
	for (const item of plan.items) {
		const card = container.createDiv({ cls: `webnovel-console__context-item is-${item.inclusion}` });
		new Setting(card).setName(item.title).setHeading();
		card.createDiv({ text: `${item.id || item.key} · ${item.type} · ${item.path}${item.anchor ? `#${item.anchor}` : ''}` });
		card.createDiv({ text: `纳入状态：${label(item.inclusion)}` });
		card.createDiv({ text: `原因：${item.reasons.join('；')}` });
		card.createDiv({ text: `关系：${item.relationship}` });
		card.createDiv({ text: `权威/生命周期/范围/复核：${item.canon} / ${item.lifecycleStatus} / ${item.contextScope} / ${item.reviewStatus}` });
		card.createDiv({ text: `知识边界：reader=${item.knowledgeBoundary.reader}；allowed=${item.knowledgeBoundary.allowedReveal}` });
		if (item.containsUnrevealed) card.createDiv({ cls: 'webnovel-console__warning', text: '含未揭示信息' });
		if (item.hasConflict) card.createDiv({ cls: 'webnovel-console__warning', text: '存在资料冲突' });
		card.createDiv({ text: item.summary || '（无摘要）' });
		if (onChange) {
			const actions = card.createDiv({ cls: 'webnovel-console__actions' });
			for (const inclusion of ['manual_included', 'manual_excluded'] as const) {
				const button = actions.createEl('button', { text: label(inclusion), attr: { type: 'button' } });
				button.disabled = item.inclusion === inclusion;
				button.addEventListener('click', () => onChange(item.key, inclusion));
			}
		}
	}
}
