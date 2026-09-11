import { Setting } from 'obsidian';
import type { ChangeHistoryEntry } from '../application';

export function renderChangesPage(container: HTMLElement, entries: readonly ChangeHistoryEntry[]): void {
	if (!entries.length) { container.createDiv({ cls: 'webnovel-console__empty', text: '暂无重要变更记录。' }); return; }
	for (const entry of entries) {
		const card = container.createDiv({ cls: 'webnovel-console__entity' });
		new Setting(card).setName(`${entry.commandType} · ${entry.result}`).setHeading();
		card.createDiv({ text: `${entry.startedAt} · ${entry.auditId}` });
		card.createDiv({ text: `目标：${entry.targetKeys.join(', ') || '无'} · 文件：${entry.paths.join(', ') || '无'}` });
		if (entry.errorCode) card.createDiv({ cls: 'webnovel-console__warning', text: `错误：${entry.errorCode}` });
		for (const diff of entry.fieldDiffs) card.createDiv({ text: `${diff.path} · ${diff.field}: ${formatValue(diff.before)} → ${formatValue(diff.after)}` });
		if (entry.recoveryAvailable) card.createDiv({ cls: 'webnovel-console__notice', text: `恢复报告：${entry.compensationResult || entry.result}` });
	}
}

const formatValue = (value: unknown): string => {
	const serialized = typeof value === 'string' ? value : JSON.stringify(value);
	return (serialized || '空').slice(0, 160);
};
