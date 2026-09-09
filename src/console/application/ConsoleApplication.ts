import type { ChangePlan, ImpactReport } from '../domain';
import type { ConsoleIndexRuntime, EntitySearchRequest, EntitySearchResult, IndexServiceState } from '../indexing';
import type { MarkdownCommandPayload } from '../persistence/MarkdownChangePlanner';
import type { MarkdownPlanningPort } from '../persistence/MarkdownChangePlanner';
import type { TransactionResult } from '../persistence/TransactionExecutor';
import type { MarkdownChangePlanner, ConfirmationTokenService, TransactionExecutor } from '../persistence';
import { ChapterWorkspaceCommandService, ContextOutputRepository, ProjectStateRepository, type ProjectStateUpdate } from '../persistence';
import { createEmptyImpactReport, type ConsoleCommand } from './commands';
import { NarrativeTreeQuery } from './NarrativeTreeQuery';
import { ManuscriptQuery, type ManuscriptQueryRequest } from './ManuscriptQuery';
import { ChapterWorkspaceQuery } from './ChapterWorkspaceQuery';
import { ContextPlanner, type ContextPlanRequest } from './ContextPlanner';
import { DashboardQuery } from './DashboardQuery';
import type { ContextPlan } from '../domain';

export interface ChangePreview {
	plan: ChangePlan;
	impact: ImpactReport;
}

export class ConsoleApplication {
	constructor(
		private readonly runtime: ConsoleIndexRuntime,
		private readonly planner: MarkdownChangePlanner,
		private readonly executor: TransactionExecutor,
		private readonly tokens: ConfirmationTokenService,
		private readonly planningPort?: MarkdownPlanningPort,
	) {}

	getProjectIds(): string[] { return this.runtime.getProjectIds(); }
	getActiveProjectId(): string | undefined { return this.runtime.getActiveProjectId(); }
	setActiveProject(projectId: string): boolean { return this.runtime.setActiveProject(projectId); }
	getIndexState(): IndexServiceState { return this.runtime.getIndex()?.getState() || { status: 'error', message: 'Console index unavailable' }; }

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
	getManuscript(request: ManuscriptQueryRequest = {}) { return new ManuscriptQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(request); }
	getChapterWorkspace(chapterKey: string) { return new ChapterWorkspaceQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(chapterKey); }
	planContext(request: ContextPlanRequest): ContextPlan {
		const project = this.runtime.getProjectConfig();
		return new ContextPlanner(() => this.runtime.getIndex()?.getSnapshot(), {
			relationDepth: project?.contextDepth ?? 1, eventPrerequisiteDepth: project?.eventPrerequisiteDepth ?? 2,
		}).plan(request);
	}

	async getDashboard() {
		const repository = this.projectStateRepository();
		return new DashboardQuery(() => this.runtime.getIndex()?.getSnapshot()).execute(repository ? await repository.read() : null);
	}

	async previewProjectState(update: ProjectStateUpdate): Promise<ChangePreview> {
		const repository = this.requireProjectStateRepository();
		const snapshotVersion = this.runtime.getIndex()?.getSnapshot()?.version;
		if (!snapshotVersion) throw new Error('Console index has no published snapshot');
		const plan = await (await repository.read() ? repository.planUpdate(update, snapshotVersion) : repository.planCreate(update, snapshotVersion));
		return { plan, impact: createEmptyImpactReport(plan.planId) };
	}

	async previewChapterUpdate(chapterKey: string, patch: Record<string, unknown>): Promise<ChangePreview> {
		if (!this.planningPort) throw new Error('Console persistence is unavailable');
		const service = new ChapterWorkspaceCommandService(() => this.runtime.getIndex()?.getSnapshot(), this.planningPort, this.planner);
		const plan = await service.planUpdate(chapterKey, patch);
		return { plan, impact: createEmptyImpactReport(plan.planId) };
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
}
