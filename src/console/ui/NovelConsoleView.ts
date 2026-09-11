import { ItemView, Setting, TFile, TFolder, type WorkspaceLeaf } from 'obsidian';
import type { WebNovelAssistantPlugin } from '../../types/plugin';
import type { ConsoleApplication } from '../application';
import { bindCardActivation, renderEntitySummary } from './components';
import { ConsoleLayoutController } from './layout';
import { CONSOLE_NAVIGATION } from './navigation';
import { pageTitle, restoreRouterState, type ConsolePage, type ConsoleRouterState } from './router';
import { renderContextPage } from './ContextPage';
import { renderDashboardPage } from './DashboardPage';
import { EVENT_STATUSES, IMPORTANCE_LEVELS, NARRATIVE_STATUSES, READER_STATES, type ContextPlan } from '../domain';
import { ChangePreviewModal } from './ChangePreviewModal';
import type { ChangePreview } from '../application';
import { renderEventControlPage } from './EventControlPage';
import type { TimelineView } from '../application';
import { renderHealthPage } from './HealthPage';
import { CONSOLE_BUILD_INFO, formatBuildInfo } from '../buildInfo';
import { persistOnboardingProject, renderOnboardingPage } from './OnboardingPage';
import { renderProjectSelector, resolveProjectSelection } from './ProjectSelector';
import { renderIndexStatusPanel } from './IndexStatusPanel';
import { getPageDefinition } from './pageRegistry';
import { renderGenericEntityPage, queryPageEntities } from './GenericEntityPage';
import { renderNovelOverviewPage, renderViewsPage } from './ControlOverviewPages';
import { renderChangesPage } from './ChangesPage';
import { renderIdRegistryPage } from './IdRegistryPage';
import { buildTemplatePageItems, renderTemplatesPage } from './TemplatesPage';
import { renderNarrativePage } from './NarrativePage';
import type { EntityRecord } from '../domain';
import { renderCharacterCenterDetails, renderGenericRecordDetails, renderItemCenterDetails } from './EntityCenterDetails';
import { ConsoleActionRunner, type ConsoleActionState } from './ConsoleActionRunner';
import { renderCurrentStagePage } from './CurrentStagePage';
import { createEventData, renderEventCreateForm, renderEventFieldEditor } from './EventAuthoringPage';
import { renderCurrentTasksPage, taskDataFromDraft } from './CurrentTasksPage';
import { renderSuggestions } from './SuggestionsPage';
import { renderForeshadowingDetails } from './ForeshadowingDetails';
import { renderMilestoneDetails } from './MilestoneDetails';

export const NOVEL_CONSOLE_VIEW_TYPE = 'webnovel-novel-console';

export function shouldRenderDashboard(page: ConsolePage, query: string): boolean {
	return page === 'overview' && query.trim().length === 0;
}

export function renderDetailsDismiss(parent: HTMLElement, onClose: () => void): void {
	const button = parent.createEl('button', {
		cls: 'webnovel-console__details-close',
		text: '关闭',
		attr: { type: 'button', 'aria-label': '关闭资料详情' },
	});
	button.addEventListener('click', onClose);
}

export function renderConsoleSearch(
	parent: HTMLElement,
	initialQuery: string,
	onSearch: (query: string) => void,
): void {
	const form = parent.createEl('form', {
		cls: 'webnovel-console__search-form',
		attr: { role: 'search', 'aria-label': '资料搜索' },
	});
	const input = form.createEl('input', {
		cls: 'webnovel-console__search',
		type: 'search',
		value: initialQuery,
		placeholder: '搜索标题、别名、ID 或正文',
		attr: { 'aria-label': '搜索关键词' },
	});
	const runSearch = () => onSearch(input.value);
	input.addEventListener('input', runSearch);
	form.addEventListener('submit', event => {
		event.preventDefault();
		runSearch();
	});
	form.createEl('button', {
		text: '搜索',
		attr: { type: 'submit', 'aria-label': '执行搜索' },
	});
}

export class NovelConsoleView extends ItemView {
	private state: ConsoleRouterState = restoreRouterState(undefined);
	private layout?: ConsoleLayoutController;
	private application?: ConsoleApplication;
	private unsubscribeApplication?: () => void;
	private refreshTimer?: number;
	private isOpen = false;
	private hasRendered = false;
	private readonly refreshDelayMs = 50;
	private readonly actionRunner: ConsoleActionRunner;
	private actionState?: ConsoleActionState;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: WebNovelAssistantPlugin) {
		super(leaf);
		this.application = plugin.services.getOptional('ConsoleApplication');
		this.actionRunner = new ConsoleActionRunner(state => this.updateActionState(state));
	}

	getViewType(): string { return NOVEL_CONSOLE_VIEW_TYPE; }
	getDisplayText(): string { return '小说控制台'; }
	getIcon(): string { return 'panel-top'; }

	async onOpen(): Promise<void> {
		this.isOpen = true;
		this.hasRendered = false;
		this.contentEl.empty();
		this.contentEl.addClass('webnovel-console');
		if (typeof ResizeObserver !== 'undefined') {
			this.layout = new ConsoleLayoutController(this.contentEl);
			this.layout.start();
		} else this.contentEl.dataset.layout = 'wide';
		this.unsubscribeApplication?.();
		this.unsubscribeApplication = this.application?.subscribe(event => {
			if (event.reason === 'current' || !this.hasRendered) return;
			this.scheduleRefresh();
		});
		this.render();
		this.hasRendered = true;
	}

	async onClose(): Promise<void> {
		this.isOpen = false;
		this.hasRendered = false;
		this.cancelScheduledRefresh();
		this.unsubscribeApplication?.();
		this.unsubscribeApplication = undefined;
		this.layout?.destroy();
		this.layout = undefined;
		this.contentEl.removeClass('webnovel-console');
		this.contentEl.empty();
	}

	getState(): ConsoleRouterState { return structuredClone(this.state); }

	async setState(state: unknown): Promise<void> {
		this.state = restoreRouterState(state);
		if (this.contentEl.hasClass('webnovel-console')) this.renderImmediately();
	}

	navigate(page: ConsolePage): void {
		this.state.page = page;
		this.state.selectedKey = undefined;
		this.state.detailsOpen = false;
		this.renderImmediately();
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
		this.restoreActiveProject();
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
		if (this.application) {
			renderProjectSelector(toolbar, this.application.getProjectIds(), this.application.getActiveProjectId(), projectId => {
				if (!this.application?.setActiveProject(projectId)) return;
				this.state.projectId = projectId;
				this.state.selectedKey = undefined;
				this.state.detailsOpen = false;
				this.requestStateSave();
				this.renderImmediately();
			});
		}
		const diagnostics = toolbar.createEl('details', { cls: 'webnovel-console__build-info' });
		diagnostics.createEl('summary', { text: `插件 ${CONSOLE_BUILD_INFO.version} · 构建诊断` });
		diagnostics.createDiv({ text: formatBuildInfo() });
		renderConsoleSearch(toolbar, this.state.filters.query, query => {
			this.state.filters.query = query;
			this.renderResults(main);
		});
		this.renderResults(main);
	}

	private scheduleRefresh(): void {
		if (!this.isOpen) return;
		this.cancelScheduledRefresh();
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = undefined;
			if (this.isOpen) this.render();
		}, this.refreshDelayMs);
	}

	private renderImmediately(): void {
		this.cancelScheduledRefresh();
		if (this.isOpen) this.render();
	}

	private cancelScheduledRefresh(): void {
		if (this.refreshTimer === undefined) return;
		window.clearTimeout(this.refreshTimer);
		this.refreshTimer = undefined;
	}

	private restoreActiveProject(): void {
		if (!this.application) return;
		const persisted = this.state.projectId;
		const active = this.application.getActiveProjectId();
		const selection = resolveProjectSelection(this.application.getProjectIds(), this.state.projectId, active);
		if (selection.projectId && selection.projectId !== active && !this.application.setActiveProject(selection.projectId)) {
			this.state.projectId = active;
			if (this.state.projectId !== persisted) this.requestStateSave();
			return;
		}
		this.state.projectId = selection.projectId;
		if (this.state.projectId !== persisted) this.requestStateSave();
	}

	private requestStateSave(): void {
		const workspace = this.app.workspace as unknown as { requestSaveLayout?: { run?: () => void } | (() => void) };
		if (typeof workspace.requestSaveLayout === 'object') workspace.requestSaveLayout?.run?.();
		else workspace.requestSaveLayout?.();
	}

	private renderResults(main: HTMLElement): void {
		main.querySelector('.webnovel-console__content')?.remove();
		const content = main.createDiv({ cls: 'webnovel-console__content' });
		if (!this.application) {
			content.createDiv({ cls: 'webnovel-console__empty', text: '控制台服务不可用；原有插件功能仍可继续使用。' });
			return;
		}
		const state = this.application.getIndexState();
		renderIndexStatusPanel(content, state, {
			onConfigure: () => this.openConsoleSettingsOrFocusOnboarding(),
			onRetry: () => this.application!.retryIndex(state.projectId),
			onRebuild: () => this.application!.rebuildIndex(state.projectId),
		});
		const actionFeedback = content.createDiv({ cls: 'webnovel-console__action-feedback', attr: { role: 'status', 'aria-live': 'polite' } });
		if (this.actionState) this.renderActionState(actionFeedback, this.actionState);
		if (state.status === 'unconfigured') {
			renderOnboardingPage(content, {
				folderCandidates: this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder && Boolean(file.path)).map(folder => folder.path),
				onSave: project => persistOnboardingProject(this.plugin.settings, project, () => this.plugin.saveSettings(), projects => this.application!.reconfigureProjects(projects)),
				onCancel: () => undefined,
			});
			return;
		}
		const definition = getPageDefinition(this.state.page);
		switch (definition.renderer) {
			case 'dashboard':
				if (shouldRenderDashboard(this.state.page, this.state.filters.query)) this.runUiTask('read:dashboard', async () => { const model = await this.application!.getDashboard(); if (content.isConnected) renderDashboardPage(content, model); });
				else this.renderGlobalSearch(content, main);
				return;
			case 'views': renderViewsPage(content, this.application.getControlOverview(), page => this.navigate(page)); return;
			case 'current-stage': this.runUiTask('read:current-stage', () => this.renderCurrentStage(content)); return;
			case 'current-tasks': this.runUiTask('read:current-tasks', () => this.renderCurrentTasks(content, main)); return;
			case 'novel-overview': this.runUiTask('read:novel-overview', async () => { const model = await this.application!.getNovelOverview(); if (content.isConnected) renderNovelOverviewPage(content, model, page => this.navigate(page)); }); return;
			case 'changes': this.runUiTask('read:changes', async () => { const entries = await this.application!.getChanges(); if (content.isConnected) renderChangesPage(content, entries); }); return;
			case 'id-registry': renderIdRegistryPage(content, this.application.getIdRegistry()); return;
			case 'templates': this.renderTemplates(content); return;
			case 'manuscript': this.renderManuscript(content); return;
			case 'narrative': this.renderNarrative(content, main); return;
			case 'entity-list': renderGenericEntityPage(content, this.application, this.state.page, this.state.filters.query, record => this.selectRecord(main, record)); return;
			case 'context': this.renderContext(content); return;
			case 'health': renderHealthPage(content, this.application.getHealth()); return;
			case 'milestones': this.renderMilestones(content, main); return;
			case 'event-control':
			case 'timeline': this.renderEvents(content, main); return;
		}
	}

	private renderGlobalSearch(content: HTMLElement, main: HTMLElement): void {
		const result = this.application!.search({ query: this.state.filters.query, page: 1, pageSize: 50 });
		const query = this.state.filters.query.trim();
		if (query) {
			content.createDiv({
				cls: 'webnovel-console__search-summary',
				text: `“${query}”的搜索结果：${result.total} 条`,
				attr: { role: 'status', 'aria-live': 'polite' },
			});
		}
		if (result.items.length === 0) content.createDiv({ cls: 'webnovel-console__empty', text: '暂无匹配资料。' });
		for (const record of result.items) {
			renderEntitySummary(content, record);
			const card = content.lastElementChild as HTMLElement;
			bindCardActivation(card, () => this.selectRecord(main, record));
		}
	}

	private selectRecord(main: HTMLElement, record: EntityRecord): void {
		this.state.selectedKey = record.key;
		this.state.detailsOpen = true;
		this.renderDetails(main, record);
	}

	private openConsoleSettingsOrFocusOnboarding(): void {
		const onboardingInput = this.contentEl.querySelector('.webnovel-console__onboarding input');
		if (onboardingInput instanceof HTMLElement) {
			onboardingInput.focus();
			onboardingInput.scrollIntoView({ block: 'center' });
			return;
		}
		const settings = (this.app as unknown as { setting?: { open(): void; openTabById(id: string): void } }).setting;
		settings?.open();
		settings?.openTabById(this.plugin.manifest.id);
	}

	private renderEvents(content: HTMLElement, main: HTMLElement): void {
		const route = this.state.page;
		if (route === 'events/control') renderEventCreateForm(content, (draft, button) => {
			this.runAction(`event:create:${draft.id}`, () => this.application!.previewEventCreate({ id: draft.id, title: draft.title, data: createEventData(draft) }), button);
		});
		const view: TimelineView = route === 'events/hidden' ? 'hidden_world' : route === 'events/cosmic' ? 'cosmic' : route === 'events/archive' ? 'archive' : 'reality';
		const projection = this.application!.getTimeline(view);
		renderEventControlPage(content, view, projection, key => {
			const record = this.application!.search({ query: key, page: 1, pageSize: 20 }).items.find(item => item.key === key);
			if (record) this.renderDetails(main, record);
		});
	}

	private renderMilestones(content: HTMLElement, main: HTMLElement): void {
		const records = this.application!.search({ query: this.state.filters.query, filters: { types: ['milestone'] }, page: 1, pageSize: 100 }).items;
		if (!records.length) content.createDiv({ cls: 'webnovel-console__empty', text: '暂无里程碑。' });
		for (const record of records) {
			renderEntitySummary(content, record);
			const card = content.lastElementChild as HTMLElement;
			bindCardActivation(card, () => this.renderDetails(main, record));
		}
	}

	private async renderCurrentStage(content: HTMLElement): Promise<void> {
		const state = await this.application!.getProjectState();
		if (!content.isConnected) return;
		const events = this.application!.search({ query: '', filters: { types: ['event'] }, page: 1, pageSize: 200 }).items.flatMap(record => {
			const event = this.application!.getEvent(record.key); return event?.record.id && event.data.storyline ? [{ id: event.record.id, title: event.record.title, storyline: event.data.storyline }] : [];
		});
		renderCurrentStagePage(content, {
			state, focusCandidates: this.application!.getFocusCandidates(), cursorTargets: events,
			onSaveFocus: (update, button) => this.runAction(`project-state:${update.currentFocus || 'clear'}`, () => this.application!.previewProjectState(update), button),
			onAdvanceCursor: (storyline, eventId, button) => this.runAction(`cursor:${storyline}`, () => this.application!.previewCursorProgression(storyline, eventId), button),
		});
	}

	private async renderCurrentTasks(content: HTMLElement, main: HTMLElement): Promise<void> {
		const [dashboard, suggestions] = await Promise.all([this.application!.getDashboard(), this.application!.getSuggestions()]);
		if (!content.isConnected) return;
		const taskRecords = this.application!.search({ query: '', filters: { types: ['task'] }, page: 1, pageSize: 200 }).items;
		const writable = new Set(taskRecords.filter(record => record.id && !record.data.legacyKind).map(record => record.key));
		const taskStatuses = new Map(taskRecords.flatMap(record => { const task = this.application!.getTask(record.key); return task ? [[record.key, task.data.status] as const] : []; }).filter((entry): entry is readonly [string, Exclude<typeof entry[1], 'unknown'>] => entry[1] !== 'unknown'));
		const anchors = this.application!.search({ query: '', filters: { types: ['event', 'milestone'] }, page: 1, pageSize: 200 }).items.flatMap(record => record.id ? [{ id: record.id, title: record.title, type: record.type as 'event' | 'milestone' }] : []);
		renderCurrentTasksPage(content, {
			dashboard, anchors, writableTaskIds: writable, taskStatuses,
			onCreate: (draft, button) => this.runAction(`task:create:${draft.id}`, () => this.application!.previewTaskCreate(draft.id, draft.title, taskDataFromDraft(draft)), button),
			onStatus: (key, status, button) => this.runAction(`task:status:${key}`, () => this.application!.previewTaskStatus(key, status), button),
			onOpen: key => { const record = taskRecords.find(item => item.key === key); if (record) this.selectRecord(main, record); },
		});
		renderSuggestions(content, suggestions, (suggestion, decision, task, button) => {
			const anchorId = suggestion.anchorId || anchors[0]?.id || '';
			this.runAction(`suggestion:${suggestion.id}`, () => this.application!.previewSuggestionDecision({ suggestion, decision, ...(task ? { task: { ...task, data: taskDataFromDraft({ ...task, anchorId, anchorType: anchors.find(item => item.id === anchorId)?.type || 'event' }) } } : {}) }), button);
		});
	}

	private renderManuscript(content: HTMLElement): void {
		for (const chapter of this.application!.getManuscript({ query: this.state.filters.query })) {
			const card = content.createDiv({ cls: 'webnovel-console__entity' });
			new Setting(card).setName(chapter.title).setHeading();
			card.createDiv({ text: `${chapter.status} · ${chapter.revisions.length} 个修订 · ${chapter.synopsis || '无策划摘要'}` });
			const actions = card.createDiv({ cls: 'webnovel-console__actions' });
			const adjacent = actions.createEl('button', { text: '相邻编辑器', attr: { type: 'button' } });
			adjacent.addEventListener('click', () => this.runUiTask(`open:${chapter.sourcePath}`, async () => { if (!await this.openSource(chapter.sourcePath)) throw new Error('SOURCE_NOT_FOUND'); }));
			const immersive = actions.createEl('button', { text: '沉浸写作', attr: { type: 'button' } });
			immersive.addEventListener('click', () => this.runUiTask(`immersive:${chapter.sourcePath}`, async () => { if (!await this.openImmersiveSource(chapter.sourcePath)) throw new Error('SOURCE_NOT_FOUND'); }));
		}
	}

	private renderNarrative(content: HTMLElement, main: HTMLElement): void {
		const definition = getPageDefinition(this.state.page);
		const level = definition.entityFilter?.types[0];
		if (!level || !['book', 'part', 'volume', 'unit', 'plan', 'chapter'].includes(level)) return;
		renderNarrativePage(content, this.application!.getNarrativeLevel(level as 'book' | 'part' | 'volume' | 'unit' | 'plan' | 'chapter'), definition.emptyState, key => {
			const record = this.application!.search({ query: key, page: 1, pageSize: 10 }).items.find(candidate => candidate.key === key);
			if (record) this.selectRecord(main, record);
		});
	}

	private renderTemplates(content: HTMLElement): void {
		const records = queryPageEntities(this.application!, 'control/templates');
		const settings = this.plugin.settings;
		const paths = settings.chapterTemplatePaths?.length ? settings.chapterTemplatePaths : settings.chapterTemplatePath ? [settings.chapterTemplatePath] : [];
		const items = buildTemplatePageItems(records, paths, path => {
			const file = this.app.vault.getAbstractFileByPath(path);
			return file instanceof TFile && file.extension === 'md';
		});
		renderTemplatesPage(content, items, path => this.runUiTask(`open:${path}`, async () => { if (!await this.openSource(path)) throw new Error('SOURCE_NOT_FOUND'); }), () => {
			const commands = (this.app as unknown as { commands?: { executeCommandById(id: string): void } }).commands;
			commands?.executeCommandById(`${this.plugin.manifest.id}:create-next-chapter`);
		});
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
			publish.addEventListener('click', () => this.runAction(`context:${plan.target.key}`, () => this.application!.previewContextOutput(plan), publish));
		};
		redraw();
	}

	private presentChangePreview(preview: ChangePreview): Promise<string | null> {
		return new Promise(resolve => new ChangePreviewModal(this.app, {
			plan: preview.plan, impact: preview.impact, issueToken: () => this.application!.confirm(preview.plan),
			onConfirm: (_plan, token) => resolve(token), onCancel: () => resolve(null),
		}).open());
	}

	private runAction(key: string, plan: () => Promise<ChangePreview>, button?: HTMLButtonElement): void {
		if (button) button.disabled = true;
		void this.actionRunner.run(key, plan, preview => this.presentChangePreview(preview), (preview, token) => this.application!.execute(preview.plan, token)).finally(() => {
			if (button?.isConnected) button.disabled = false;
		}).catch(error => this.reportUiFailure(key, error));
	}

	private runUiTask(key: string, task: () => Promise<unknown>): void {
		void Promise.resolve().then(task).catch(error => this.reportUiFailure(key, error));
	}

	private reportUiFailure(key: string, cause: unknown): void {
		const error = cause instanceof Error ? cause : new Error(String(cause));
		this.updateActionState({ key, phase: 'failed', message: '操作失败，可重试。', error: error.message });
	}

	private updateActionState(state: ConsoleActionState): void {
		this.actionState = state;
		const feedback = this.contentEl.querySelector('.webnovel-console__action-feedback');
		if (feedback instanceof HTMLElement) this.renderActionState(feedback, state);
	}

	private renderActionState(container: HTMLElement, state: ConsoleActionState): void {
		container.empty(); container.toggleClass('is-error', state.phase === 'failed');
		container.createDiv({ text: `${state.message || state.phase}${state.error ? `：${state.error}` : ''}` });
	}

	private renderDetails(main: HTMLElement, record: ReturnType<ConsoleApplication['search']>['items'][number]): void {
		main.querySelector('.webnovel-console__details')?.remove();
		const drawer = main.createEl('aside', { cls: 'webnovel-console__details', attr: { 'aria-label': '资料详情' } });
		renderDetailsDismiss(drawer, () => {
			this.state.selectedKey = undefined;
			this.state.detailsOpen = false;
			drawer.remove();
			this.requestStateSave();
		});
		new Setting(drawer).setName(record.title).setHeading();
		drawer.createDiv({ text: record.source.path });
		const open = drawer.createEl('button', { text: '在相邻编辑器打开原文', attr: { type: 'button' } });
		open.addEventListener('click', () => this.runUiTask(`open:${record.source.path}`, async () => { if (!await this.openSource(record.source.path)) throw new Error('SOURCE_NOT_FOUND'); }));
		if (record.type !== 'character' && record.type !== 'item') renderGenericRecordDetails(drawer, record);
		if (record.type === 'chapter') {
			const immersive = drawer.createEl('button', { text: '进入沉浸写作', attr: { type: 'button' } });
			immersive.addEventListener('click', () => this.runUiTask(`immersive:${record.source.path}`, async () => { if (!await this.openImmersiveSource(record.source.path)) throw new Error('SOURCE_NOT_FOUND'); }));
			const workspace = this.application?.getChapterWorkspace(record.key);
			if (workspace) {
				drawer.createDiv({ text: `事件 ${workspace.events.length} · 人物 ${workspace.characters.length} · 组织 ${workspace.organizations.length} · 地点 ${workspace.locations.length} · 道具 ${workspace.items.length} · 伏笔 ${workspace.foreshadowing.length} · 任务 ${workspace.tasks.length} · 修订 ${workspace.revisions.length}` });
				const title = drawer.createEl('input', { type: 'text', value: record.title, attr: { 'aria-label': '章节标题' } });
				const preview = drawer.createEl('button', { text: '预览标题修改', attr: { type: 'button' } });
				preview.addEventListener('click', () => this.runAction(`chapter:${record.key}`, () => this.application!.previewChapterUpdate(record.key, { title: title.value }), preview));
			}
		}
		if (record.type === 'event') {
			const event = this.application?.getEvent(record.key);
			if (event) renderEventFieldEditor(drawer, event.data, (patch, button) => this.runAction(`event:fields:${record.key}`, () => this.application!.previewEventFields(record.key, patch), button));
			this.renderEventControls(drawer, record.key);
			this.runUiTask(`read:cursor-suggestion:${record.key}`, async () => {
				const suggestion = await this.application?.getCursorSuggestion(record.id || record.key);
				if (!suggestion || !drawer.isConnected) return;
				const cursor = drawer.createEl('button', { text: `预览推进 ${suggestion.storyline} 游标`, attr: { type: 'button' } });
				cursor.addEventListener('click', () => this.runAction(`cursor:${suggestion.storyline}`, () => this.application!.previewCursorProgression(suggestion.storyline, suggestion.suggestedEventId), cursor));
			});
		}
		if (record.type === 'milestone') { const milestone = this.application?.getMilestone(record.key); if (milestone) renderMilestoneDetails(drawer, milestone, (status, button) => this.runAction(`milestone:${record.key}`, () => this.application!.previewMilestoneProgression(record.id || record.key, status), button)); }
		if (record.type === 'foreshadowing') this.runUiTask(`read:foreshadowing:${record.key}`, async () => { const model = await this.application?.getForeshadowing(record.key); if (model && drawer.isConnected) renderForeshadowingDetails(drawer, model, (patch, button) => this.runAction(`foreshadowing:${record.key}`, () => this.application!.previewForeshadowingUpdate(record.key, patch), button)); });
		if (record.type === 'character') {
			const center = this.application?.getCharacterCenter(record.key);
			if (center) renderCharacterCenterDetails(drawer, center, related => this.renderDetails(main, related));
		}
		if (record.type === 'item') {
			const center = this.application?.getItemCenter(record.key);
			if (center) renderItemCenterDetails(drawer, center, related => this.renderDetails(main, related));
		}
	}

	private renderEventControls(drawer: HTMLElement, eventKey: string): void {
		const event = this.application?.getEvent(eventKey); if (!event?.record.id) return;
		const addSelect = <T extends string>(label: string, current: string, options: readonly T[], preview: (value: T) => Promise<ChangePreview>) => {
			const row = drawer.createDiv({ cls: 'webnovel-console__actions' });
			row.createSpan({ text: `${label}：${current}` });
			const select = row.createEl('select', { attr: { 'aria-label': label } });
			for (const option of options) select.createEl('option', { value: option, text: option });
			select.value = current;
			const button = row.createEl('button', { text: '预览修改', attr: { type: 'button' } });
			button.addEventListener('click', () => this.runAction(`event:${eventKey}:${label}`, () => preview(select.value as T), button));
		};
		addSelect('事件事实状态', event.data.eventStatus, EVENT_STATUSES, value => this.application!.previewEventProgression(event.record.id!, value));
		addSelect('叙事承载状态', event.data.narrativeStatus, NARRATIVE_STATUSES, value => this.application!.previewNarrativeProgression(event.record.id!, value));
		addSelect('读者知识状态', event.data.readerState, READER_STATES, value => this.application!.previewReaderProgression(event.record.id!, value));
		for (const [label, target, config] of [['现实线重要度', 'reality', event.data.timelineViews.reality], ['隐藏线重要度', 'hidden_world', event.data.timelineViews.hiddenWorld], ['宇宙线重要度', 'cosmic', event.data.timelineViews.cosmic]] as const) {
			addSelect(label, config?.importance || 'unknown', IMPORTANCE_LEVELS, value => this.application!.previewTimelineImportance(event.record.id!, target, value));
		}
	}
}
