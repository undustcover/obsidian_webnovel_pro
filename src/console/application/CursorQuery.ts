import type { EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';
import type { ProjectState } from '../persistence';
import { eventDataFromRecord } from '../persistence';
import { EventGraph, type EventDistance } from './EventGraph';

export interface CursorLine { storyline: string; cursorId?: string; event?: EntityRecord; valid: boolean }
export interface CursorSuggestion { suggestionId: string; storyline: string; currentCursorId: string; suggestedEventId: string; distance: EventDistance }

export class CursorQuery {
	constructor(private snapshotProvider: () => IndexSnapshot | undefined) {}
	lines(state: ProjectState | null): CursorLine[] {
		const snapshot = this.snapshotProvider();
		if (!state) return [];
		return Object.entries(state.storylineCursors).sort(([a], [b]) => a.localeCompare(b)).map(([storyline, cursorId]) => {
			const event = snapshot?.idRegistry.resolve(cursorId);
			const valid = event?.type === 'event' && eventDataFromRecord(event).storyline === storyline;
			return { storyline, cursorId, event: valid ? event : undefined, valid };
		});
	}

	suggestForOpenedEvent(state: ProjectState | null, openedEventId: string): CursorSuggestion | null {
		const snapshot = this.snapshotProvider(); const opened = snapshot?.idRegistry.resolve(openedEventId);
		if (!snapshot || !state || opened?.type !== 'event') return null;
		const storyline = eventDataFromRecord(opened).storyline; const currentCursorId = state.storylineCursors[storyline];
		if (!currentCursorId || currentCursorId === openedEventId) return null;
		const distance = new EventGraph(snapshot).distance(currentCursorId, openedEventId);
		return { suggestionId: `SUG:CURSOR_ADVANCE:${openedEventId}:${currentCursorId}`, storyline, currentCursorId, suggestedEventId: openedEventId, distance };
	}
}
