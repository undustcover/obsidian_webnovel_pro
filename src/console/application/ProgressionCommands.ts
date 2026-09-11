import type { ChangePlan, ImpactReport, MilestoneStatus } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { eventDataFromRecord, type EventRepository, type MarkdownChangePlanner, type MarkdownPlanningPort, type ProjectStateRepository } from '../persistence';
import { EventCommandService } from './EventCommands';
import { ProgressionImpactAnalyzer } from './ProgressionImpactAnalyzer';

export interface ProgressionPreview { plan: ChangePlan; impact: ImpactReport }
const allowedMilestone = (from: MilestoneStatus | 'unknown', to: MilestoneStatus): boolean => from !== 'unknown' && from !== to && ((from === 'planned' && ['active', 'cancelled'].includes(to)) || (from === 'active' && ['completed', 'cancelled'].includes(to)) || (['completed', 'cancelled'].includes(from) && to === 'active'));

function replaceScalar(content: string, field: string, value: string): string {
	const pattern = new RegExp(`^${field}:.*$`, 'm');
	if (pattern.test(content)) return content.replace(pattern, `${field}: ${value}`);
	const end = content.startsWith('---') ? content.indexOf('\n---', 3) : -1;
	if (end < 0) throw new Error('INVALID_MILESTONE_FRONTMATTER');
	return `${content.slice(0, end)}\n${field}: ${value}${content.slice(end)}`;
}

export class ProgressionCommandService {
	private analyzer = new ProgressionImpactAnalyzer();
	constructor(private snapshotProvider: () => IndexSnapshot | undefined, private events: EventRepository, private projectState: ProjectStateRepository, private port: MarkdownPlanningPort, private planner: MarkdownChangePlanner) {}
	async previewEventStatus(eventId: string, status: Parameters<EventCommandService['updateEventStatus']>[1], requestedAt?: string): Promise<ProgressionPreview> {
		return this.withImpact(await new EventCommandService(this.events).updateEventStatus(eventId, status, requestedAt));
	}
	async previewNarrativeStatus(eventId: string, status: Parameters<EventCommandService['updateNarrativeStatus']>[1], requestedAt?: string): Promise<ProgressionPreview> {
		return this.withImpact(await new EventCommandService(this.events).updateNarrativeStatus(eventId, status, requestedAt));
	}
	async previewReaderState(eventId: string, state: Parameters<EventCommandService['updateReaderState']>[1], requestedAt?: string): Promise<ProgressionPreview> {
		return this.withImpact(await new EventCommandService(this.events).updateReaderState(eventId, state, requestedAt));
	}
	async previewCursor(storyline: string, eventId: string, requestedAt?: string): Promise<ProgressionPreview> {
		const snapshot = this.requireSnapshot(); const event = snapshot.idRegistry.resolve(eventId);
		if (event?.type !== 'event') throw new Error('EVENT_NOT_FOUND');
		if (eventDataFromRecord(event).storyline !== storyline) throw new Error('CURSOR_STORYLINE_MISMATCH');
		return this.withImpact(await this.projectState.planCursorUpdate(storyline, eventId, snapshot.version, requestedAt));
	}
	async previewCursorUndo(storyline: string, previousEventId: string, requestedAt?: string): Promise<ProgressionPreview> {
		const preview = await this.previewCursor(storyline, previousEventId, requestedAt);
		preview.plan.warnings.push('撤销仅恢复该剧情线游标；不会回滚事件、里程碑、知识状态或其他已确认事实。');
		return preview;
	}
	async previewMilestoneStatus(milestoneId: string, to: MilestoneStatus, requestedAt = new Date().toISOString()): Promise<ProgressionPreview> {
		const snapshot = this.requireSnapshot(); const milestone = snapshot.idRegistry.resolve(milestoneId);
		if (milestone?.type !== 'milestone') throw new Error('MILESTONE_NOT_FOUND');
		const from = (milestone.data.status as MilestoneStatus | 'unknown') || 'unknown';
		if (!allowedMilestone(from, to)) throw new Error(`MILESTONE_TRANSITION_NOT_ALLOWED:${from}->${to}`);
		const current = await this.port.read(milestone.source.path); if (!current) throw new Error('MILESTONE_SOURCE_NOT_FOUND');
		const plan = await this.planner.plan({ type: to === 'completed' ? 'complete-milestone' : 'update-milestone-status', actor: 'author', requestedAt, targetKeys: [milestoneId], payload: { mutations: [{ path: milestone.source.path, operation: 'modify', content: replaceScalar(current.content, 'status', to) }], fieldDiffs: [{ path: milestone.source.path, field: 'status', before: from, after: to }] } }, snapshot.version);
		plan.fieldDiffs = [{ path: milestone.source.path, field: 'status', before: from, after: to }];
		return this.withImpact(plan);
	}
	private requireSnapshot(): IndexSnapshot { const snapshot = this.snapshotProvider(); if (!snapshot) throw new Error('INDEX_UNAVAILABLE'); return snapshot; }
	private withImpact(plan: ChangePlan): ProgressionPreview { return { plan, impact: this.analyzer.analyze(plan, this.requireSnapshot()) }; }
}
