import { Setting } from 'obsidian';
import type { ConsoleApplication, ControlOverviewModel, NovelOverviewModel } from '../application';
import { CONSOLE_NAVIGATION } from './navigation';
import { getPageDefinition } from './pageRegistry';
import type { ConsolePage } from './router';

const countFor = (model: ControlOverviewModel, page: ConsolePage): number | undefined => {
	const types = getPageDefinition(page).entityFilter?.types;
	if (!types?.length) return undefined;
	return types.reduce((sum, type) => sum + (model.counts[type] || 0), 0);
};

export function renderViewsPage(container: HTMLElement, model: ControlOverviewModel, onNavigate: (page: ConsolePage) => void): void {
	container.createDiv({ cls: 'webnovel-console__summary', text: `项目 ${model.projectId || '未配置'} · ${model.totalRecords} 条索引记录` });
	for (const group of CONSOLE_NAVIGATION) {
		const section = container.createDiv({ cls: 'webnovel-console__section' });
		new Setting(section).setName(group.label).setHeading();
		for (const page of group.pages) {
			const definition = getPageDefinition(page);
			const count = countFor(model, page);
			const button = section.createEl('button', { text: `${definition.title}${count === undefined ? '' : ` · ${count}`}`, attr: { type: 'button' } });
			button.addEventListener('click', () => onNavigate(page));
		}
	}
}

export function renderNovelOverviewPage(container: HTMLElement, model: NovelOverviewModel, onNavigate: (page: ConsolePage) => void): void {
	container.createDiv({ cls: 'webnovel-console__summary', text: `项目 ${model.projectId || '未配置'} · 索引 ${model.dashboard.indexStatus} · 健康问题 ${model.dashboard.healthCount}` });
	container.createDiv({ text: `当前焦点：${model.dashboard.currentFocus || '未设置'}` });
	const cursors = Object.entries(model.dashboard.storylineCursors);
	container.createDiv({ text: cursors.length ? `故事线游标：${cursors.map(([line, value]) => `${line} → ${value}`).join('；')}` : '故事线游标：未设置' });
	const structure = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(structure).setName('叙事结构').setHeading();
	for (const [page, type] of [['narrative/book', 'book'], ['narrative/parts', 'part'], ['narrative/volumes', 'volume'], ['narrative/units', 'unit'], ['narrative/plans', 'plan'], ['narrative/chapters', 'chapter']] as const) {
		const button = structure.createEl('button', { text: `${getPageDefinition(page).title} · ${model.narrativeCounts[type]}`, attr: { type: 'button' } });
		button.addEventListener('click', () => onNavigate(page));
	}
}

export async function renderCurrentReadOnlyPage(container: HTMLElement, application: ConsoleApplication, page: 'control/current-stage' | 'control/current-tasks'): Promise<void> {
	const dashboard = await application.getDashboard();
	if (page === 'control/current-stage') {
		container.createDiv({ text: `当前焦点：${dashboard.currentFocus || '未设置'}` });
		container.createDiv({ text: Object.keys(dashboard.storylineCursors).length ? `游标：${Object.entries(dashboard.storylineCursors).map(([key, value]) => `${key} → ${value}`).join('；')}` : '尚未设置故事线游标。' });
		container.createDiv({ cls: 'webnovel-console__notice', text: '本阶段先提供只读状态；创建、编辑和推进将在 Wave 8B 接入预览确认。' });
		return;
	}
	const groups = dashboard.actionGroups;
	for (const [name, items] of Object.entries(groups)) {
		container.createDiv({ cls: 'webnovel-console__summary', text: `${name} · ${items.length}` });
		for (const item of items) container.createDiv({ text: `${item.title} · ${item.reason}` });
	}
}
