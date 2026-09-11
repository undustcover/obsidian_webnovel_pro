import { createReadyState, createUnconfiguredState, type ChangePlan, type ConsoleAvailabilityState, type ContextPlan, type CreativeTaskData, type CreativeTaskStatus, type EventData, type EventStatus, type ImpactReport, type Importance, type MilestoneStatus, type NarrativeStatus, type ReaderState, type SuggestionDecision } from '../domain';
import type { ConsoleIndexRuntime, ConsoleRuntimeChange, EntitySearchRequest, EntitySearchResult } from '../indexing';
import type { MarkdownCommandPayload } from '../persistence/MarkdownChangePlanner';
import type { MarkdownPlanningPort } from '../persistence/MarkdownChangePlanner';
import type { TransactionResult } from '../persistence/TransactionExecutor';
import type { MarkdownChangePlanner, ConfirmationTokenService, TransactionExecutor, AuditRepository } from '../persistence';
import { ChapterWorkspaceCommandService, ContextOutputRepository, CreativeTaskRepository, EventRepository, ForeshadowingCommandService, ProjectStateRepository, SuggestionDecisionRepository, eventDataFromRecord, type ForeshadowingPatch, type NewEvent, type ProjectStateUpdate, type SuggestionDecisionEntry } from '../persistence';
import { createEmptyImpactReport, type ConsoleCommand } from './commands';
import { NarrativeTreeQuery } from './NarrativeTreeQuery';
import { ManuscriptQuery, type ManuscriptQueryRequest } from './ManuscriptQuery';
import { ChapterWorkspaceQuery } from './ChapterWorkspaceQuery';
import { ContextPlanner, type ContextPlanRequest } from './ContextPlanner';
import { DashboardQuery } from './DashboardQuery';
import { TimelineProjectionQuery, type TimelineView } from './TimelineProjectionQuery';
import { EventCommandService } from './EventCommands';
import { ProgressionCommandService } from './ProgressionCommands';
import { CharacterCenterQuery, ItemCenterQuery } from './EntityCenters';
import { HealthRuleRegistry } from './HealthRuleRegistry';
import type { ConsoleProjectConfig } from '../config';
import { ControlOverviewQuery } from './ControlOverviewQuery';
import { ChangesQuery } from './ChangesQuery';
import { IdRegistryQuery } from './IdRegistryQuery';
import { NarrativeLevelQuery, type NarrativeLevel } from './NarrativeLevelQuery';
import { CursorQuery } from './CursorQuery';
import { ForeshadowingActionRules } from './ForeshadowingActionRules';
import { MilestoneEvaluator, milestoneDataFromRecord } from './MilestoneEvaluator';
import { ProgressionImpactAnalyzer } from './ProgressionImpactAnalyzer';
import { SuggestionCommandService } from './SuggestionCommands';
import { SuggestionService, type Suggestion } from './SuggestionService';

export type SuggestionUiDecision = 'accept' | 'defer' | 'ignore' | 'not_applicable' | 'convert_to_task';
export interface SuggestionDecisionRequest { suggestion: Suggestion; decision: SuggestionUiDecision; snoozeUntilAnchor?: string; rationale?: string; task?: { id: string; title: string; data: CreativeTaskData } }

export interface ChangePreview {
	plan: ChangePlan;
	impact: ImpactReport;
}

export interface ConsoleApplicationEvent {
	readonly sequence: number;
	readonly reason: ConsoleRuntimeChange;
	readonly projectIds: readonly string[];
	readonly activeProjectId?: string;
	readonly projectId?: string;
	readonly availability: ConsoleAvailabilityState;
}

export type ConsoleApplicationListener = (event: ConsoleApplicationEvent) => void;

export class ConsoleApplication {
	constructor(
		private readonly runtime: ConsoleIndexRuntime,
		private readonly planner: MarkdownChangePlanner,
		private readonly executor: TransactionExecutor,
		private readonly tokens: ConfirmationTokenService,
		private readonly planningPort?: MarkdownPlanningPort,
		private readonly auditRepository?: AuditRepository,
	) {}

	getProjectIds(): string[] { return this.runtime.getProjectIds(); }
	getActiveProjectId(): string | undefined { return this.runtime.getActiveProjectId(); }
	setActiveProject(projectId: string): boolean { return this.runtime.setActiveProject(projectId); }
	reconfigureProjects(projects: readonly ConsoleProjectConfig[]): Promise<{ projectIds: string[]; activeProjectId?: string }> { return this.runtime.reconfigure(projects); }
	retryIndex(projectId = this.runtime.getActiveProjectId()) { return this.runtime.retry(projectId); }
	rebuildIndex(projectId = this.runtime.getActiveProjectId()) { return this.runtime.rebuild(projectId); }
	subscribe(listener: ConsoleApplicationListener): () => void {
		let lastAvailability = '';
		return this.runtime.subscribe(event => {
			if (event.projectId && event.projectId !== event.activeProjectId) return;
			const availability = this.getIndexState();
			const signature = JSON.stringify({ projectIds: event.projectIds, activeProjectId: event.activeProjectId, availability });
			const alwaysNotify = event.change === 'current' || event.change === 'configuration' || event.change === 'active-project';
			if (!alwaysNotify && signature === lastAvailability) return;
			lastAvailability = signature;
			listener(Object.freeze({
				sequence: event.sequence,
				reason: event.change,
				projectIds: event.projectIds,
				activeProjectId: event.activeProjectId,
				projectId: event.projectId,
				availability,
			}));
		});
	}
	getIndexState(): ConsoleAvailabilityState {
		const projectIds = this.runtime.getProjectIds();
		const diagnostics = this.runtime.getConfigDiagnostics();
		const configError = diagnostics.find((item) => item.severity === 'error');
		if (!projectIds.length) {
			if (!configError) return createUnconfiguredState();
			return { status: 'error', code: 'CONSOLE_CONFIG_INVALID', message: configError.message, technicalDetail: configError.code, retryable: false, suggestedActions: ['configure'] };
		}

		const projectId = this.runtime.getActiveProjectId();
		if (!projectId) return { status: 'error', code: 'CONSOLE_PROJECT_UNKNOWN', message: '当前项目无效，请重新选择项目。', retryable: false, suggestedActions: ['configure'] };
		const index = this.runtime.getIndex(projectId);
		if (!index) return { status: 'error', code: 'INDEX_UNAVAILABLE', projectId, message: '项目索引不可用。', retryable: true, suggestedActions: ['retry'] };

		const state = index.getState();
		const snapshot = index.getSnapshot();
		if (state.status === 'indexing') return { status: 'initializing', code: 'INDEX_INITIALIZING', projectId, message: '正在建立项目索引。', retryable: false, suggestedActions: [], processed: state.processed, total: state.total };
		if (state.status === 'error') return { status: 'error', code: 'INDEX_SCAN_FAILED', projectId, message: '项目索引失败。', technicalDetail: state.message, retryable: true, suggestedActions: ['retry', 'rebuild'] };
		if (!snapshot) return { status: 'initializing', code: 'INDEX_INITIALIZING', projectId, message: '正在等待首个索引快照。', retryable: false, suggestedActions: [], processed: 0, total: 0 };

		const cacheError = this.runtime.getCacheError(projectId);
		if (state.status === 'degraded' || cacheError) {
			return {
				status: 'degraded',
				code: cacheError ? 'INDEX_CACHE_WRITE_FAILED' : 'INDEX_SCAN_FAILED',
				projectId,
				message: cacheError ? '索引已就绪，但派生缓存保存失败。' : `索引已就绪，但有 ${state.status === 'degraded' ? state.failedPaths.length : 0} 个文件失败。`,
				retryable: true,
				suggestedActions: ['retry', 'rebuild'],
				snapshotVersion: snapshot.version,
				recordCount: snapshot.records.length,
				failedPaths: state.status === 'degraded' ? [...state.failedPaths] : [],
			};
		}
		return createReadyState(projectId, snapshot.version, snapshot.records.length);
	}

	search(request: EntitySearchRequest): EntitySearchResult {
		return this.runtime.getIndex()?.getSnapshot()?.search(request) || {
			items: [], total: 0, page: Math.max(1, Math.floor(request.page || 1)),
			pageSize: Math.max(1, Math.min(200, Math.floor(request.pageSize || 1))),
		};
	}

	async preview(command: ConsoleCommand<MarkdownCommandPayload>): Promise<ChangePreview> {
		const snapshotVersion = this.runtime.getIndex()?.getSnapshot()?.version;
		if (!snapshotVersion) throw new Error('Console index has no published snapshot');
		const plan = await this.planner.plan(command, snapshotVersion);
		return { plan, impact: createEmptyImpactReport(plan.planId) };
	}

	confirm(plan: ChangePlan): string {
		if (!plan.requiresConfirmation) throw new Error('Confirmation tokens are only issued for confirmed plans');
		return this.tokens.issue(plan.planId);
	}

	async execute(plan: ChangePlan, token?: string): Promise<TransactionResult> {
		return this.executor.execute(plan, token);
	}

	getNarrativeTree() { return new NarrativeTreeQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(); }
	getNarrativeLevel(level: NarrativeLevel) { return new NarrativeLevelQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(level); }
	getControlOverview() { return new ControlOverviewQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(); }
	getIdRegistry() { return new IdRegistryQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(); }
	getChanges() { return new ChangesQuery(this.auditRepository).execute(); }
	getManuscript(request: ManuscriptQueryRequest = {}) { return new ManuscriptQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(request); }
	getChapterWorkspace(chapterKey: string) { return new ChapterWorkspaceQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(chapterKey); }
	getTimeline(view: TimelineView, storyline?: string) { return new TimelineProjectionQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(view, storyline); }
	getEvent(key: string) {
		const snapshot = this.runtime.getIndex()?.getSnapshot(); const record = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key);
		return record?.type === 'event' ? { record, data: eventDataFromRecord(record) } : undefined;
	}
	getCharacterCenter(key: string) { return new CharacterCenterQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(key); }
	getItemCenter(key: string) { return new ItemCenterQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(key); }
	getHealth() { const snapshot = this.runtime.getIndex()?.getSnapshot(); return snapshot ? new HealthRuleRegistry().evaluate(snapshot) : []; }
	planContext(request: ContextPlanRequest): ContextPlan {
		const project = this.runtime.getProjectConfig();
		return new ContextPlanner(() => this.runtime.getIndex()?.getSnapshot(), {
			relationDepth: project?.contextDepth ?? 1, eventPrerequisiteDepth: project?.eventPrerequisiteDepth ?? 2,
		}).plan(request);
	}

	async getDashboard() {
		const repository = this.projectStateRepository();
		return new DashboardQuery(() => this.runtime.getIndex()?.getSnapshot(), () => this.getIndexState()).execute(repository ? await repository.read() : null);
	}
	async getProjectState() { return await this.projectStateRepository()?.read() || null; }
	async getCursorLines() { const state = await this.getProjectState(); return new CursorQuery(() => this.runtime.getIndex()?.getSnapshot()).lines(state); }
	async getCursorSuggestion(eventId: string) { const state = await this.getProjectState(); return new CursorQuery(() => this.runtime.getIndex()?.getSnapshot()).suggestForOpenedEvent(state, eventId); }
	getFocusCandidates() { return this.search({ query: '', page: 1, pageSize: 200 }).items.filter(record => Boolean(record.id) && !['project_state', 'suggestion_decision_log'].includes(record.type)); }

	async previewEventCreate(input: NewEvent): Promise<ChangePreview> { return this.withImpact(await this.requireEventRepository().planCreate(input)); }
	async previewEventFields(key: string, patch: Partial<Pick<EventData, 'storyline' | 'storyTime' | 'storyTimeEnd' | 'timelineOrder' | 'prerequisiteEventIds' | 'currentPlanIds' | 'currentChapterIds' | 'characterIds' | 'organizationIds' | 'locationIds' | 'itemIds' | 'causes' | 'results' | 'longTermImpacts' | 'evidenceFiles'>>): Promise<ChangePreview> {
		const current = this.requireEventRepository().read(key); if (!current) throw new Error('EVENT_NOT_FOUND');
		return this.withImpact(await this.requireEventRepository().planUpdate(key, { ...structuredClone(current.data), ...structuredClone(patch) }));
	}
	getMilestone(key: string) {
		const snapshot = this.runtime.getIndex()?.getSnapshot(); const record = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key);
		if (!snapshot || record?.type !== 'milestone') return null;
		const data = milestoneDataFromRecord(record); return { record, data, evaluation: new MilestoneEvaluator(snapshot).evaluate(data) };
	}

	getTask(key: string) { return this.creativeTaskRepository()?.read(key) || null; }
	async previewTaskCreate(id: string, title: string, data: CreativeTaskData): Promise<ChangePreview> { this.validateTaskAnchors(data); return this.withImpact(await this.requireCreativeTaskRepository().planCreate(id, title, data)); }
	async previewTaskStatus(key: string, status: CreativeTaskStatus): Promise<ChangePreview> { return this.withImpact(await this.requireCreativeTaskRepository().planStatus(key, status)); }
	async getSuggestions(): Promise<Suggestion[]> {
		const repository = this.suggestionDecisionRepository(); const snapshot = this.runtime.getIndex()?.getSnapshot();
		if (!repository || !snapshot) return [];
		const decisions = await repository.latest(); const state = await this.getProjectState();
		return new SuggestionService().derive(new HealthRuleRegistry().evaluate(snapshot, state, decisions), decisions);
	}
	async previewSuggestionDecision(request: SuggestionDecisionRequest): Promise<ChangePreview> {
		const snapshot = this.runtime.getIndex()?.getSnapshot(); if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		const decisionMap: Record<Exclude<SuggestionUiDecision, 'convert_to_task'>, SuggestionDecision> = { accept: 'handled', defer: 'snoozed', ignore: 'ignored_once', not_applicable: 'not_applicable' };
		const entry: SuggestionDecisionEntry = { suggestionId: request.suggestion.id, ruleId: request.suggestion.ruleId, targetKey: request.suggestion.targetKey, decision: request.decision === 'convert_to_task' ? 'converted_to_task' : decisionMap[request.decision], decidedAt: new Date().toISOString(), ...(request.snoozeUntilAnchor ? { snoozeUntilAnchor: request.snoozeUntilAnchor } : {}), ...(request.rationale ? { rationale: request.rationale } : {}), ...(request.task ? { resultingTaskId: request.task.id } : {}) };
		const decisionRepository = this.requireSuggestionDecisionRepository();
		const latest = (await decisionRepository.latest()).get(entry.suggestionId);
		if (latest?.decision === entry.decision && latest.resultingTaskId === entry.resultingTaskId) throw new Error('SUGGESTION_ALREADY_DECIDED');
		const service = new SuggestionCommandService(decisionRepository, this.requireCreativeTaskRepository());
		const plan = request.decision === 'convert_to_task' ? await service.planConvert(entry, request.task || (() => { throw new Error('SUGGESTION_TASK_REQUIRED'); })(), snapshot.version) : await service.planDecision(entry, snapshot.version);
		return this.withImpact(plan);
	}
	async getForeshadowing(key: string) {
		const snapshot = this.runtime.getIndex()?.getSnapshot(); const record = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key);
		if (!snapshot || record?.type !== 'foreshadowing') return null;
		return { record, writable: !record.data.legacyKind, diagnostics: new ForeshadowingActionRules(snapshot, await this.getProjectState()).evaluate(record) };
	}
	async previewForeshadowingUpdate(key: string, patch: ForeshadowingPatch): Promise<ChangePreview> {
		const snapshot = this.runtime.getIndex()?.getSnapshot(); if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		for (const id of [...(patch.truth_event_ids || []), ...(patch.plant_before || []), ...(patch.advance_when || []), ...(patch.reveal_after || [])]) {
			if (snapshot.idRegistry.resolve(id)?.type !== 'event') throw new Error(`FORESHADOWING_ANCHOR_NOT_FOUND:${id}`);
		}
		return this.withImpact(await this.requireForeshadowingService().planUpdate(key, patch));
	}

	async getNovelOverview() {
		return new ControlOverviewQuery(() => this.runtime.getIndex()?.getSnapshot()).executeNovel(await this.getDashboard());
	}

	async previewProjectState(update: ProjectStateUpdate): Promise<ChangePreview> {
		const snapshot = this.runtime.getIndex()?.getSnapshot();
		if (!snapshot) throw new Error('Console index has no published snapshot');
		if (update.currentFocus && !snapshot.idRegistry.resolve(update.currentFocus) && !snapshot.byKey.get(update.currentFocus)) throw new Error('CURRENT_FOCUS_NOT_FOUND');
		const repository = this.requireProjectStateRepository();
		const snapshotVersion = snapshot.version;
		if (!snapshotVersion) throw new Error('Console index has no published snapshot');
		const plan = await (await repository.read() ? repository.planUpdate(update, snapshotVersion) : repository.planCreate(update, snapshotVersion));
		return this.withImpact(plan);
	}

	async previewChapterUpdate(chapterKey: string, patch: Record<string, unknown>): Promise<ChangePreview> {
		if (!this.planningPort) throw new Error('Console persistence is unavailable');
		const service = new ChapterWorkspaceCommandService(() => this.runtime.getIndex()?.getSnapshot(), this.planningPort, this.planner);
		const plan = await service.planUpdate(chapterKey, patch);
		return this.withImpact(plan);
	}

	async previewTimelineImportance(eventId: string, target: Parameters<EventCommandService['updateTimelineImportance']>[1], importance: Importance): Promise<ChangePreview> {
		const repository = this.requireEventRepository();
		const plan = await new EventCommandService(repository).updateTimelineImportance(eventId, target, importance);
		return this.withImpact(plan);
	}

	async previewEventProgression(eventId: string, status: EventStatus): Promise<ChangePreview> {
		return this.requireProgressionService().previewEventStatus(eventId, status);
	}

	async previewNarrativeProgression(eventId: string, status: NarrativeStatus): Promise<ChangePreview> {
		return this.requireProgressionService().previewNarrativeStatus(eventId, status);
	}

	async previewReaderProgression(eventId: string, state: ReaderState): Promise<ChangePreview> {
		return this.requireProgressionService().previewReaderState(eventId, state);
	}

	async previewCursorProgression(storyline: string, eventId: string): Promise<ChangePreview> {
		return this.requireProgressionService().previewCursor(storyline, eventId);
	}

	async previewMilestoneProgression(milestoneId: string, status: MilestoneStatus): Promise<ChangePreview> {
		return this.requireProgressionService().previewMilestoneStatus(milestoneId, status);
	}

	async previewContextOutput(context: ContextPlan): Promise<ChangePreview> {
		const repository = this.contextOutputRepository();
		if (!repository) throw new Error('Console persistence is unavailable');
		const plan = await repository.planOutput(context);
		return { plan, impact: createEmptyImpactReport(plan.planId) };
	}

	private projectStateRepository(): ProjectStateRepository | undefined {
		const project = this.runtime.getProjectConfig();
		return project && this.planningPort ? new ProjectStateRepository(project, this.planningPort, this.planner) : undefined;
	}
	private requireProjectStateRepository(): ProjectStateRepository {
		const repository = this.projectStateRepository();
		if (!repository) throw new Error('Console persistence is unavailable');
		return repository;
	}
	private contextOutputRepository(): ContextOutputRepository | undefined {
		const project = this.runtime.getProjectConfig();
		return project && this.planningPort ? new ContextOutputRepository(project, this.planningPort, this.planner, this.executor) : undefined;
	}
	private eventRepository(): EventRepository | undefined {
		const project = this.runtime.getProjectConfig();
		return project && this.planningPort ? new EventRepository(() => this.runtime.getIndex()?.getSnapshot(), project, this.planningPort, this.planner) : undefined;
	}
	private requireEventRepository(): EventRepository {
		const repository = this.eventRepository(); if (!repository) throw new Error('Console persistence is unavailable'); return repository;
	}
	private requireProgressionService(): ProgressionCommandService {
		if (!this.planningPort) throw new Error('Console persistence is unavailable');
		return new ProgressionCommandService(() => this.runtime.getIndex()?.getSnapshot(), this.requireEventRepository(), this.requireProjectStateRepository(), this.planningPort, this.planner);
	}
	private creativeTaskRepository(): CreativeTaskRepository | undefined { const project = this.runtime.getProjectConfig(); return project && this.planningPort ? new CreativeTaskRepository(() => this.runtime.getIndex()?.getSnapshot(), project, this.planningPort, this.planner) : undefined; }
	private requireCreativeTaskRepository(): CreativeTaskRepository { const repository = this.creativeTaskRepository(); if (!repository) throw new Error('Console persistence is unavailable'); return repository; }
	private suggestionDecisionRepository(): SuggestionDecisionRepository | undefined { const project = this.runtime.getProjectConfig(); return project && this.planningPort ? new SuggestionDecisionRepository(project, this.planningPort, this.planner) : undefined; }
	private requireSuggestionDecisionRepository(): SuggestionDecisionRepository { const repository = this.suggestionDecisionRepository(); if (!repository) throw new Error('Console persistence is unavailable'); return repository; }
	private requireForeshadowingService(): ForeshadowingCommandService { if (!this.planningPort) throw new Error('Console persistence is unavailable'); return new ForeshadowingCommandService(() => this.runtime.getIndex()?.getSnapshot(), this.planningPort, this.planner); }
	private withImpact(plan: ChangePlan): ChangePreview { const snapshot = this.runtime.getIndex()?.getSnapshot(); return { plan, impact: snapshot ? new ProgressionImpactAnalyzer().analyze(plan, snapshot) : createEmptyImpactReport(plan.planId) }; }
	private validateTaskAnchors(data: CreativeTaskData): void {
		const snapshot = this.runtime.getIndex()?.getSnapshot(); if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		const refs = 'anchorId' in data.activation ? [{ id: data.activation.anchorId, type: data.activation.anchorType }] : data.activation.relation === 'between' ? [{ id: data.activation.startAnchorId, type: data.activation.anchorType }, { id: data.activation.endAnchorId, type: data.activation.anchorType }] : data.activation.blockerIds.map(id => ({ id, type: data.activation.anchorType }));
		for (const ref of refs) { const record = snapshot.idRegistry.resolve(ref.id); if (!record || (ref.type === 'event' && record.type !== 'event') || (ref.type === 'milestone' && record.type !== 'milestone') || (ref.type === 'task' && record.type !== 'task')) throw new Error(`TASK_ANCHOR_NOT_FOUND:${ref.id}`); }
	}
}
