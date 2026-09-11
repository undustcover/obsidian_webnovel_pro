import type { EntityRecord, MilestoneData, MilestoneEvaluation } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { eventDataFromRecord } from '../persistence';

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const field = (data: Record<string, unknown>, snake: string, camel: string): unknown => data[snake] ?? data[camel];

export function milestoneDataFromRecord(record: EntityRecord): MilestoneData {
	if (record.type !== 'milestone') throw new Error('MILESTONE_NOT_FOUND');
	const completion = record.data.completion && typeof record.data.completion === 'object' && !Array.isArray(record.data.completion) ? record.data.completion as Record<string, unknown> : {};
	const mode = completion.mode;
	return {
		storyline: typeof record.data.storyline === 'string' ? record.data.storyline : '',
		status: ['planned', 'active', 'completed', 'cancelled'].includes(String(record.data.status)) ? record.data.status as MilestoneData['status'] : 'unknown',
		completion: {
			mode: ['all', 'any', 'sequence', 'manual'].includes(String(mode)) ? mode as MilestoneData['completion']['mode'] : 'manual',
			requiredEventIds: strings(field(completion, 'required_event_ids', 'requiredEventIds')),
		},
		relatedPartIds: strings(field(record.data, 'related_part_ids', 'relatedPartIds')),
		relatedVolumeIds: strings(field(record.data, 'related_volume_ids', 'relatedVolumeIds')),
		relatedUnitIds: strings(field(record.data, 'related_unit_ids', 'relatedUnitIds')),
	};
}

function canonicalOrder(events: EntityRecord[]): string[] | null {
	const parsed = events.map(record => ({ id: record.id!, data: eventDataFromRecord(record) }));
	const calendars = new Set(parsed.map(item => item.data.storyTime?.calendar || ''));
	const comparableTime = calendars.size === 1 && parsed.every(item => item.data.storyTime?.sortKey);
	if (comparableTime) return parsed.sort((a, b) => a.data.storyTime!.sortKey!.localeCompare(b.data.storyTime!.sortKey!)).map(item => item.id);
	if (parsed.every(item => item.data.timelineOrder !== undefined)) return parsed.sort((a, b) => a.data.timelineOrder! - b.data.timelineOrder!).map(item => item.id);
	return null;
}

export class MilestoneEvaluator {
	constructor(private snapshot: IndexSnapshot) {}
	evaluate(data: MilestoneData): MilestoneEvaluation {
		if (data.completion.mode === 'manual') return 'manual_review';
		const events = data.completion.requiredEventIds.map(id => this.snapshot.idRegistry.resolve(id));
		if (events.some(record => !record || record.type !== 'event')) return 'indeterminate';
		const typed = events as EntityRecord[];
		const occurred = typed.map(record => eventDataFromRecord(record).eventStatus === 'occurred');
		if (data.completion.mode === 'any') return occurred.some(Boolean) ? 'completion_ready' : 'not_ready';
		if (!occurred.every(Boolean)) return 'not_ready';
		if (data.completion.mode === 'all') return 'completion_ready';
		const ordered = canonicalOrder(typed);
		return !ordered ? 'indeterminate' : ordered.every((id, index) => id === data.completion.requiredEventIds[index]) ? 'completion_ready' : 'not_ready';
	}
}
