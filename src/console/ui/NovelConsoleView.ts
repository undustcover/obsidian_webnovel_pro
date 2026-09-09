import { ItemView, Setting, TFile, type WorkspaceLeaf } from 'obsidian';
import type { WebNovelAssistantPlugin } from '../../types/plugin';
import type { ConsoleApplication } from '../application';
import { renderEntitySummary } from './components';
import { ConsoleLayoutController } from './layout';
import { CONSOLE_NAVIGATION } from './navigation';
import { pageTitle, restoreRouterState, type ConsolePage, type ConsoleRouterState } from './router';
import { renderContextPage } from './ContextPage';
import { renderDashboardPage } from './DashboardPage';
import type { ContextPlan } from '../domain';
import { ChangePreviewModal } from './ChangePreviewModal';
import type { ChangePreview } from '../application';

export const NOVEL_CONSOLE_VIEW_TYPE = 'webnovel-novel-console';

export class NovelConsoleView extends ItemView {
	private state: ConsoleRouterState = restoreRouterState(undefined);
	private layout?: ConsoleLayoutController;
	private application?: ConsoleApplication;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: WebNovelAssistantPlugin) {
		super(leaf);
		this.application = plugin.services.getOptional('ConsoleApplication');
	}

	getViewType(): string { return NOVEL_CONSOLE_VIEW_TYPE; }
	getDisplayText(): string { return '小说控制台'; }
	getIcon(): string { return 'panel-top'; }

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('webnovel-console');
		if (typeof ResizeObserver !== 'undefined') {
			this.layout = new ConsoleLayoutController(this.contentEl);
			this.layout.start();
		} else this.contentEl.dataset.layout = 'wide';
		this.render();
	}

	async onClose(): Promise<void> {
		this.layout?.destroy();
		this.layout = undefined;
		this.contentEl.removeClass('webnovel-console');
		this.contentEl.empty();
	}

	getState(): ConsoleRouterState { return structuredClone(this.state); }

	async setState(state: unknown): Promise<void> {
		this.state = restoreRouterState(state);
		if (this.contentEl.hasClass('webnovel-console')) this.render();
	}

	navigate(page: ConsolePage): void {
		this.state.page = page;
		this.state.selectedKey = undefined;
		this.state.detailsOpen = false;
		this.render();
	}

	async openSource(path: string): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return false;
		const leaf = this.app.workspace.getLeaf('split');
		await leaf.openFile(file);
		return true;
	}

	async openImmersiveSource(path: string): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return false;
		const leaf = this.app.workspace.getLeaf('split');
		await leaf.openFile(file);
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
		await this.plugin.immersiveModeManager.ensureImmersiveMode();
		return true;
	}

	private render(): void {
		this.contentEl.empty();
		const shell = this.contentEl.createDiv({ cls: 'webnovel-console__shell' });
		const sidebar = shell.createEl('nav', { cls: 'webnovel-console__sidebar', attr: { 'aria-label': '小说控制台导航' } });
		new Setting(sidebar).setName('小说控制台').setHeading();
		for (const group of CONSOLE_NAVIGATION) {
			const section = sidebar.createDiv({ cls: 'webnovel-console__nav-group' });
			section.createDiv({ cls: 'webnovel-console__nav-label', text: group.label });
			for (const page of group.pages) {
				const button = section.createEl('button', { cls: 'webnovel-console__nav-item', text: pageTitle(page), attr: { type: 'button' } });
				button.toggleClass('is-active', page === this.state.page);
				button.addEventListener('click', () => this.navigate(page));
			}
		}

		const main = shell.createEl('main', { cls: 'webnovel-console__main' });
		const toolbar = main.createDiv({ cls: 'webnovel-console__toolbar' });
		new Setting(toolbar).setName(pageTitle(this.state.page)).setHeading();
		const input = toolbar.createEl('input', { cls: 'webnovel-console__search', type: 'search', value: this.state.filters.query, placeholder: '搜索标题、别名、ID 或正文', attr: { 'aria-label': '搜索' } });
		input.addEventListener('input', () => { this.state.filters.query = input.value; this.renderResults(main); });
		this.renderResults(main);
	}

	private renderResults(main: HTMLElement): void {
		main.querySelector('.webnovel-console__content')?.remove();
		const content = main.createDiv({ cls: 'webnovel-console__content' });
		if (!this.application) {
			content.createDiv({ cls: 'webnovel-console__empty', text: '控制台服务不可用；原有插件功能仍可继续使用。' });
			return;
		}
		const state = this.application.getIndexState();
		content.createDiv({ cls: `webnovel-console__status is-${state.status}`, text: `索引状态：${state.status}` });
		if (this.state.page === 'overview') {
			void this.application.getDashboard().then(model => { if (content.isConnected) renderDashboardPage(content, model); });
			return;
		}
		if (this.state.page === 'manuscript') { this.renderManuscript(content); return; }
		if (this.state.page.startsWith('narrative/')) { this.renderNarrative(content, main); return; }
		if (this.state.page === 'context') { this.renderContext(content); return; }
		const result = this.application.search({ query: this.state.filters.query, page: 1, pageSize: 50 });
		if (result.items.length === 0) content.createDiv({ cls: 'webnovel-console__empty', text: '暂无匹配资料。' });
		for (const record of result.items) {
			renderEntitySummary(content, record);
			const card = content.lastElementChild as HTMLElement;
			card.tabIndex = 0;
			card.addEventListener('click', () => { this.state.selectedKey = record.key; this.state.detailsOpen = true; this.renderDetails(main, record); });
		}
	}

	private renderManuscript(content: HTMLElement): void {
		for (const chapter of this.application!.getManuscript({ query: this.state.filters.query })) {
			const card = content.createDiv({ cls: 'webnovel-console__entity' });
			new Setting(card).setName(chapter.title).setHeading();
			card.createDiv({ text: `${chapter.status} · ${chapter.revisions.length} 个修订 · ${chapter.synopsis || '无策划摘要'}` });
			const actions = card.createDiv({ cls: 'webnovel-console__actions' });
			const adjacent = actions.createEl('button', { text: '相邻编辑器', attr: { type: 'button' } });
			adjacent.addEventListener('click', () => { void this.openSource(chapter.sourcePath); });
			const immersive = actions.createEl('button', { text: '沉浸写作', attr: { type: 'button' } });
			immersive.addEventListener('click', () => { void this.openImmersiveSource(chapter.sourcePath); });
		}
	}

	private renderNarrative(content: HTMLElement, main: HTMLElement): void {
		const result = this.application!.getNarrativeTree();
		for (const diagnostic of result.diagnostics) content.createDiv({ cls: 'webnovel-console__warning', text: diagnostic.message });
		const renderNodes = (parent: HTMLElement, nodes: typeof result.roots) => {
			const list = parent.createEl('ul', { cls: 'webnovel-console__tree' });
			for (const node of nodes) {
				const item = list.createEl('li');
				const button = item.createEl('button', { text: `${node.storyCode ? `${node.storyCode} · ` : ''}${node.title}`, attr: { type: 'button' } });
				button.addEventListener('click', () => {
					const record = this.application!.search({ query: node.key, page: 1, pageSize: 10 }).items.find(candidate => candidate.key === node.key);
					if (record) this.renderDetails(main, record);
				});
				if (node.children.length) renderNodes(item, node.children);
			}
		};
		renderNodes(content, result.roots);
	}

	private renderContext(content: HTMLElement): void {
		if (!this.state.selectedKey) {
			content.createDiv({ text: '选择一个目标以生成有限上下文预览。' });
			for (const record of this.application!.search({ query: this.state.filters.query, page: 1, pageSize: 20 }).items) {
				const button = content.createEl('button', { cls: 'webnovel-console__target', text: `${record.title} · ${record.id || record.key}`, attr: { type: 'button' } });
				button.addEventListener('click', () => { this.state.selectedKey = record.key; this.renderResults(this.contentEl.querySelector('.webnovel-console__main') as HTMLElement); });
			}
			return;
		}
		const included = new Set<string>();
		const excluded = new Set<string>();
		let plan: ContextPlan = this.application!.planContext({ target: { kind: 'custom', key: this.state.selectedKey } });
		const redraw = () => {
			content.empty();
			renderContextPage(content, plan, (key, inclusion) => {
				if (inclusion === 'manual_included') { included.add(key); excluded.delete(key); }
				else { excluded.add(key); included.delete(key); }
				plan = this.application!.planContext({ target: plan.target, manual: { included: [...included], excluded: [...excluded] } });
				redraw();
			});
			const publish = content.createEl('button', { text: '预览发布 MD + JSON', attr: { type: 'button' } });
			publish.addEventListener('click', () => { void this.application!.previewContextOutput(plan).then(preview => this.openChangePreview(preview)); });
		};
		redraw();
	}

	private openChangePreview(preview: ChangePreview): void {
		new ChangePreviewModal(this.app, {
			plan: preview.plan, impact: preview.impact, issueToken: () => this.application!.confirm(preview.plan),
			onConfirm: async (plan, token) => { await this.application!.execute(plan, token); },
		}).open();
	}

	private renderDetails(main: HTMLElement, record: ReturnType<ConsoleApplication['search']>['items'][number]): void {
		main.querySelector('.webnovel-console__details')?.remove();
		const drawer = main.createEl('aside', { cls: 'webnovel-console__details', attr: { 'aria-label': '资料详情' } });
		new Setting(drawer).setName(record.title).setHeading();
		drawer.createDiv({ text: record.source.path });
		const open = drawer.createEl('button', { text: '在相邻编辑器打开原文', attr: { type: 'button' } });
		open.addEventListener('click', () => { void this.openSource(record.source.path); });
		if (record.type === 'chapter') {
			const immersive = drawer.createEl('button', { text: '进入沉浸写作', attr: { type: 'button' } });
			immersive.addEventListener('click', () => { void this.openImmersiveSource(record.source.path); });
			const workspace = this.application?.getChapterWorkspace(record.key);
			if (workspace) {
				drawer.createDiv({ text: `事件 ${workspace.events.length} · 人物 ${workspace.characters.length} · 组织 ${workspace.organizations.length} · 地点 ${workspace.locations.length} · 道具 ${workspace.items.length} · 伏笔 ${workspace.foreshadowing.length} · 任务 ${workspace.tasks.length} · 修订 ${workspace.revisions.length}` });
				const title = drawer.createEl('input', { type: 'text', value: record.title, attr: { 'aria-label': '章节标题' } });
				const preview = drawer.createEl('button', { text: '预览标题修改', attr: { type: 'button' } });
				preview.addEventListener('click', () => { void this.application!.previewChapterUpdate(record.key, { title: title.value }).then(change => this.openChangePreview(change)); });
			}
		}
	}
}
