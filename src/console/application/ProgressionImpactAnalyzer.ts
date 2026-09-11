import type { ChangePlan, EntityRecord, ImpactReport } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { createEmptyImpactReport } from './commands';

const add = (set: Set<string>, record: EntityRecord) => set.add(record.id || record.key);
const categoryFor = (type: EntityRecord['type']): 'events' | 'tasks' | 'foreshadowing' | 'characters' | 'items' | 'chapters' | undefined => ({ event: 'events', task: 'tasks', foreshadowing: 'foreshadowing', character: 'characters', item: 'items', chapter: 'chapters' } as const)[type as 'event'];
const stringIds = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const nested = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export class ProgressionImpactAnalyzer {
	analyze(plan: ChangePlan, snapshot: IndexSnapshot): ImpactReport {
		const report = createEmptyImpactReport(plan.planId);
		const targets = new Set(plan.command.targetKeys);
		const incoming = new Set<string>(); const outgoing = new Set<string>();
		const categories: Record<string, Set<string>> = { events: new Set(), tasks: new Set(), foreshadowing: new Set(), characters: new Set(), items: new Set(), chapters: new Set(), knowledgeStates: new Set(), contexts: new Set() };
		for (const target of targets) {
			const record = snapshot.byKey.get(target) || snapshot.idRegistry.resolve(target);
			if (!record) { report.unknownRisks.push(`TARGET_NOT_INDEXED:${target}`); continue; }
			const ownCategory = categoryFor(record.type); if (ownCategory) add(categories[ownCategory], record);
			for (const link of record.links) { outgoing.add(link.toRef); if (!snapshot.idRegistry.resolve(link.toRef) && !snapshot.byKey.has(link.toRef)) report.unknownRisks.push(`UNRESOLVED_LINK:${link.toRef}`); }
			for (const candidate of snapshot.records) if (candidate.links.some(link => link.toRef === (record.id || record.key))) {
				add(incoming, candidate); const candidateCategory = categoryFor(candidate.type); if (candidateCategory) add(categories[candidateCategory], candidate);
			}
			const data = record.data;
			for (const [field, category] of [['current_chapter_ids', 'chapters'], ['character_ids', 'characters'], ['item_ids', 'items']] as const) {
				for (const id of Array.isArray(data[field]) ? data[field] : []) if (typeof id === 'string') categories[category].add(id);
			}
			if (record.type === 'milestone') {
				const completion = nested(data.completion);
				for (const id of stringIds(completion.required_event_ids ?? completion.requiredEventIds)) categories.events.add(id);
			}
			if (record.type === 'foreshadowing') {
				for (const field of ['truth_event_ids', 'plant_before', 'advance_when', 'reveal_after']) for (const id of stringIds(data[field])) categories.events.add(id);
			}
			if (record.type === 'task') {
				const activation = nested(data.activation);
				for (const value of [activation.anchor_id, activation.anchorId, activation.start_anchor_id, activation.startAnchorId, activation.end_anchor_id, activation.endAnchorId]) if (typeof value === 'string' && value.startsWith('EVT-')) categories.events.add(value);
				for (const id of stringIds(activation.blocker_ids ?? activation.blockerIds)) if (id.startsWith('EVT-')) categories.events.add(id);
			}
			if (record.type === 'event') categories.knowledgeStates.add(record.id || record.key);
		}
		report.incomingLinks = [...incoming].sort(); report.outgoingLinks = [...outgoing].sort();
		for (const key of ['events', 'tasks', 'foreshadowing', 'characters', 'items', 'chapters', 'knowledgeStates', 'contexts'] as const) report[key] = [...categories[key]].sort();
		report.healthItems = snapshot.diagnostics.filter(item => targets.has(item.entityKey)).map(item => ({ ruleId: item.ruleId, severity: item.severity, entityKey: item.entityKey }));
		report.importantChangeSuggested = plan.risk === 'high' && plan.fieldDiffs.some(diff => ['event_status', 'status', 'storyline_cursors'].some(field => diff.field.includes(field)));
		report.unknownRisks = [...new Set(report.unknownRisks)].sort();
		return report;
	}
}
