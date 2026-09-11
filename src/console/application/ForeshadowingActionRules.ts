import type { DiagnosticRef, EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';
import type { ProjectState } from '../persistence';
import { eventDataFromRecord } from '../persistence';
import { EventGraph } from './EventGraph';

export class ForeshadowingActionRules {
	constructor(private snapshot: IndexSnapshot, private state: ProjectState | null, private threshold = 2) {}
	evaluate(record: EntityRecord): DiagnosticRef[] {
		if (record.type !== 'foreshadowing' || record.data.legacyKind || ['revealed', 'abandoned'].includes(String(record.data.status))) return [];
		const stages = [['plant_before', 'planned'], ['advance_when', 'planted'], ['reveal_after', 'advanced']] as const; const diagnostics: DiagnosticRef[] = [];
		for (const [field, status] of stages) if (record.data.status === status) for (const anchorId of array(record.data[field])) {
			const anchor = this.snapshot.idRegistry.resolve(anchorId); if (anchor?.type !== 'event') continue; const event = eventDataFromRecord(anchor); const cursor = this.state?.storylineCursors[event.storyline]; if (!cursor) continue;
			const graph = new EventGraph(this.snapshot); const forward = graph.distance(cursor, anchorId); const passed = graph.distance(anchorId, cursor);
			if (passed.kind === 'distance' && passed.distance > 0) diagnostics.push(this.diagnostic(record, 'PROG_FORESHADOWING_ANCHOR_PASSED', anchorId, `${field} 锚点已越过`));
			else if (forward.kind === 'distance' && forward.distance <= this.threshold) diagnostics.push(this.diagnostic(record, 'PROG_FORESHADOWING_OVERDUE', anchorId, `${field} 锚点即将到达`));
		}
		return diagnostics;
	}
	private diagnostic(record: EntityRecord, ruleId: string, anchorId: string, message: string): DiagnosticRef { return { ruleId, severity: 'suggestion', entityKey: record.id || record.key, message, evidence: [{ path: record.source.path, value: anchorId }], suggestion: '由作者确认后更新伏笔状态' }; }
}
const array = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
