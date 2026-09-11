import type { EntityRecord, EventData, Importance, StoryTime } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { eventDataFromRecord } from '../persistence';

export type TimelineView = 'reality' | 'hidden_world' | 'cosmic' | `character:${string}` | `organization:${string}` | 'archive';
export interface TimelineProjectionItem { event: EntityRecord; data: EventData; importance: Importance | 'unknown'; timeGroup: string; comparable: boolean }
export interface TimelineProjection { items: TimelineProjectionItem[]; warnings: string[] }

function selected(event: EntityRecord, data: EventData, view: TimelineView): Importance | 'unknown' | undefined {
	if (view === 'archive') return event.lifecycleStatus === 'archived' || data.eventStatus === 'cancelled' || data.eventStatus === 'superseded' ? 'normal' : undefined;
	if (view === 'reality') return data.timelineViews.reality?.visible ? data.timelineViews.reality.importance || 'unknown' : undefined;
	if (view === 'hidden_world') return data.timelineViews.hiddenWorld?.visible ? data.timelineViews.hiddenWorld.importance || 'unknown' : undefined;
	if (view === 'cosmic') return data.timelineViews.cosmic?.visible ? data.timelineViews.cosmic.importance || 'unknown' : undefined;
	const [kind, id] = view.split(':');
	return kind === 'character' ? data.timelineViews.characters[id] : data.timelineViews.organizations[id];
}

function comparable(left?: StoryTime, right?: StoryTime): boolean {
	return Boolean(left?.sortKey && right?.sortKey && (left.calendar || '') === (right.calendar || ''));
}

export class TimelineProjectionQuery {
	constructor(private snapshotProvider: () => IndexSnapshot | undefined) {}
	execute(view: TimelineView, storyline?: string): TimelineProjection {
		const snapshot = this.snapshotProvider();
		if (!snapshot) return { items: [], warnings: ['INDEX_UNAVAILABLE'] };
		const items = snapshot.records.filter(record => record.type === 'event').flatMap(event => {
			const data = eventDataFromRecord(event);
			const importance = selected(event, data, view);
			if (!importance || (storyline && data.storyline !== storyline)) return [];
			return [{ event, data, importance, timeGroup: data.storyTime?.calendar || 'unmapped', comparable: Boolean(data.storyTime?.sortKey) }];
		});
		const warnings = new Set<string>();
		items.sort((left, right) => {
			if (comparable(left.data.storyTime, right.data.storyTime)) return left.data.storyTime!.sortKey!.localeCompare(right.data.storyTime!.sortKey!);
			if ((left.data.storyTime?.calendar || '') !== (right.data.storyTime?.calendar || '')) {
				if (left.data.storyTime?.calendar && right.data.storyTime?.calendar) warnings.add('CROSS_CALENDAR_NOT_COMPARABLE');
				else warnings.add('STORY_TIME_NOT_COMPARABLE');
				return left.timeGroup.localeCompare(right.timeGroup) || left.event.key.localeCompare(right.event.key);
			}
			else if (!left.data.storyTime?.sortKey || !right.data.storyTime?.sortKey) warnings.add('STORY_TIME_NOT_COMPARABLE');
			return (left.data.timelineOrder ?? Number.MAX_SAFE_INTEGER) - (right.data.timelineOrder ?? Number.MAX_SAFE_INTEGER) || left.event.key.localeCompare(right.event.key);
		});
		return { items, warnings: [...warnings] };
	}
}
