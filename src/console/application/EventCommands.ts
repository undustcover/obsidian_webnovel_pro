import { canTransitionEventStatus, canTransitionNarrativeStatus, canTransitionReaderState, type ChangePlan, type EventData, type EventStatus, type Importance, type NarrativeStatus, type ReaderState } from '../domain';
import type { EventRepository } from '../persistence';

type TimelineTarget = 'reality' | 'hidden_world' | 'cosmic' | `character:${string}` | `organization:${string}`;

export class EventCommandService {
	constructor(private repository: EventRepository) {}
	async updateTimelineImportance(eventId: string, target: TimelineTarget, importance: Importance, requestedAt?: string): Promise<ChangePlan> {
		const current = this.repository.read(eventId); if (!current) throw new Error('EVENT_NOT_FOUND');
		const data: EventData = structuredClone(current.data); const [kind, id] = target.split(':');
		if (kind === 'reality') data.timelineViews.reality = { visible: data.timelineViews.reality?.visible ?? true, importance };
		else if (kind === 'hidden_world') data.timelineViews.hiddenWorld = { visible: data.timelineViews.hiddenWorld?.visible ?? true, importance };
		else if (kind === 'cosmic') data.timelineViews.cosmic = { visible: data.timelineViews.cosmic?.visible ?? true, importance };
		else if (kind === 'character' && id) data.timelineViews.characters[id] = importance;
		else if (kind === 'organization' && id) data.timelineViews.organizations[id] = importance;
		else throw new Error('INVALID_TIMELINE_VIEW');
		const before = kind === 'character' ? current.data.timelineViews.characters[id] : kind === 'organization' ? current.data.timelineViews.organizations[id] : kind === 'hidden_world' ? current.data.timelineViews.hiddenWorld?.importance : current.data.timelineViews[kind]?.importance;
		const plan = await this.repository.planUpdate(eventId, data, requestedAt, 'update-timeline-importance');
		plan.fieldDiffs = [{ path: current.record.source.path, field: `timeline_views.${target}.importance`, before, after: importance }];
		return plan;
	}
	async updateEventStatus(eventId: string, to: EventStatus, requestedAt?: string): Promise<ChangePlan> { return this.updateState(eventId, 'eventStatus', to, requestedAt); }
	async updateNarrativeStatus(eventId: string, to: NarrativeStatus, requestedAt?: string): Promise<ChangePlan> { return this.updateState(eventId, 'narrativeStatus', to, requestedAt); }
	async updateReaderState(eventId: string, to: ReaderState, requestedAt?: string): Promise<ChangePlan> { return this.updateState(eventId, 'readerState', to, requestedAt); }
	private async updateState(eventId: string, field: 'eventStatus' | 'narrativeStatus' | 'readerState', to: EventStatus | NarrativeStatus | ReaderState, requestedAt?: string): Promise<ChangePlan> {
		const current = this.repository.read(eventId); if (!current) throw new Error('EVENT_NOT_FOUND');
		const from = current.data[field];
		const allowed = field === 'eventStatus' ? canTransitionEventStatus(from as EventStatus | 'unknown', to as EventStatus) : field === 'narrativeStatus' ? canTransitionNarrativeStatus(from as NarrativeStatus | 'unknown', to as NarrativeStatus) : canTransitionReaderState(from as ReaderState | 'unknown', to as ReaderState);
		if (!allowed) throw new Error(`EVENT_STATE_TRANSITION_NOT_ALLOWED:${field}:${from}->${to}`);
		if (field === 'eventStatus' && to === 'occurring' && !current.data.storyTime) throw new Error('EVENT_TIME_REQUIRED_FOR_OCCURRING');
		const data = structuredClone(current.data); (data as unknown as Record<string, unknown>)[field] = to;
		const type = field === 'eventStatus' ? 'update-event-status' : field === 'narrativeStatus' ? 'update-narrative-status' : 'update-reader-state';
		const plan = await this.repository.planUpdate(eventId, data, requestedAt, type);
		plan.fieldDiffs = [{ path: current.record.source.path, field: field === 'eventStatus' ? 'event_status' : field === 'narrativeStatus' ? 'narrative_status' : 'reader_state', before: from, after: to }];
		return plan;
	}
}
