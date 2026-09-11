import type { EntityRecord, EventData } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { eventDataFromRecord } from '../persistence';

export type EventGraphReason = 'cycle' | 'missing_edge' | 'cross_storyline' | 'unreachable' | 'event_missing';
export type EventDistance = { kind: 'distance'; distance: number } | { kind: 'indeterminate'; reason: EventGraphReason; eventIds: string[] };

export class EventGraph {
	private readonly events = new Map<string, { record: EntityRecord; data: EventData }>();
	private readonly successors = new Map<string, string[]>();
	private readonly missing = new Map<string, string[]>();
	constructor(snapshot: IndexSnapshot) {
		for (const record of snapshot.records.filter(item => item.type === 'event' && item.id)) this.events.set(record.id!, { record, data: eventDataFromRecord(record) });
		for (const [id, event] of this.events) for (const prerequisite of event.data.prerequisiteEventIds) {
			const predecessor = this.events.get(prerequisite);
			if (!predecessor) { this.missing.set(id, [...(this.missing.get(id) || []), prerequisite]); continue; }
			if (predecessor.data.storyline !== event.data.storyline) continue;
			this.successors.set(prerequisite, [...(this.successors.get(prerequisite) || []), id].sort());
		}
	}

	detectCycles(storyline?: string): string[][] {
		const state = new Map<string, 0 | 1 | 2>(); const stack: string[] = []; const cycles: string[][] = [];
		const visit = (id: string) => {
			state.set(id, 1); stack.push(id);
			for (const next of this.successors.get(id) || []) {
				if (state.get(next) === 1) cycles.push([...stack.slice(stack.indexOf(next)), next]);
				else if (!state.get(next)) visit(next);
			}
			stack.pop(); state.set(id, 2);
		};
		for (const [id, event] of this.events) if ((!storyline || event.data.storyline === storyline) && !state.get(id)) visit(id);
		return cycles;
	}

	distance(fromId: string, toId: string): EventDistance {
		const from = this.events.get(fromId); const to = this.events.get(toId);
		if (!from || !to) return { kind: 'indeterminate', reason: 'event_missing', eventIds: [fromId, toId].filter(id => !this.events.has(id)) };
		if (from.data.storyline !== to.data.storyline) return { kind: 'indeterminate', reason: 'cross_storyline', eventIds: [fromId, toId] };
		const cycles = this.detectCycles(from.data.storyline);
		if (cycles.length) return { kind: 'indeterminate', reason: 'cycle', eventIds: [...new Set(cycles.flat())] };
		const relevantMissing = [...this.missing.entries()].filter(([id]) => this.events.get(id)?.data.storyline === from.data.storyline).flatMap(([id, values]) => [id, ...values]);
		if (relevantMissing.length) return { kind: 'indeterminate', reason: 'missing_edge', eventIds: [...new Set(relevantMissing)] };
		const queue: Array<[string, number]> = [[fromId, 0]]; const seen = new Set([fromId]);
		while (queue.length) { const [id, distance] = queue.shift()!; if (id === toId) return { kind: 'distance', distance }; for (const next of this.successors.get(id) || []) if (!seen.has(next)) { seen.add(next); queue.push([next, distance + 1]); } }
		return { kind: 'indeterminate', reason: 'unreachable', eventIds: [fromId, toId] };
	}
}
