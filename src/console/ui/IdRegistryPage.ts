import { Setting } from 'obsidian';
import type { IdRegistryModel } from '../application';

export function renderIdRegistryPage(container: HTMLElement, model: IdRegistryModel): void {
	if (!model.byType.length) { container.createDiv({ cls: 'webnovel-console__empty', text: '当前项目没有可登记实体。' }); return; }
	for (const summary of model.byType) {
		const section = container.createDiv({ cls: 'webnovel-console__section' });
		new Setting(section).setName(summary.type).setHeading();
		section.createDiv({ text: `占用 ${summary.occupied.length} · 缺失 ${summary.missing.length} · 重复 ${summary.duplicateIds.length} · 格式问题 ${summary.formatIssues.length}` });
		if (summary.nextCandidate) section.createDiv({ text: `下一个候选：${summary.nextCandidate}` });
		if (summary.occupied.length) section.createDiv({ cls: 'webnovel-console__muted', text: summary.occupied.join(', ') });
		for (const record of summary.missing) section.createDiv({ cls: 'webnovel-console__warning', text: `缺失 ID：${record.title} · ${record.source.path}` });
		for (const id of summary.duplicateIds) section.createDiv({ cls: 'webnovel-console__warning', text: `重复 ID：${id}` });
		for (const issue of summary.formatIssues) section.createDiv({ cls: 'webnovel-console__warning', text: `${issue.message} · ${issue.evidence[0]?.path || issue.entityKey}` });
	}
}
