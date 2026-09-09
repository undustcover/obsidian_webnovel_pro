import { CONTEXT_SCHEMA_VERSION, type ContextItem, type ContextPlan, type ContextTargetKind, type EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { contentHash, stableSerialize } from './commands';

export interface ContextManualOverrides { included?: readonly string[]; excluded?: readonly string[] }
export interface ContextPolicy { relationDepth: number; eventPrerequisiteDepth: number; allowedReveal?: string }
export interface ContextPlanRequest {
	target: { kind: ContextTargetKind; key: string; title?: string };
	manual?: ContextManualOverrides;
	policy?: Partial<ContextPolicy>;
	now?: Date;
}

const values = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
const bounded = (value: number | undefined, fallback: number) => Number.isInteger(value) ? Math.max(0, Math.min(5, value!)) : fallback;
const scalar = (value: unknown, fallback: string): string => ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : fallback;

export class ContextPlanner {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined, private readonly defaults: ContextPolicy = { relationDepth: 1, eventPrerequisiteDepth: 2 }) {}

	plan(request: ContextPlanRequest): ContextPlan {
		const snapshot = this.snapshotProvider();
		if (!snapshot) throw new Error('Console index has no published snapshot');
		const policy: ContextPolicy = {
			relationDepth: bounded(request.policy?.relationDepth, this.defaults.relationDepth),
			eventPrerequisiteDepth: bounded(request.policy?.eventPrerequisiteDepth, this.defaults.eventPrerequisiteDepth),
			allowedReveal: request.policy?.allowedReveal ?? this.defaults.allowedReveal,
		};
		const manualIncluded = new Set(request.manual?.included || []);
		const manualExcluded = new Set(request.manual?.excluded || []);
		const byRef = new Map<string, EntityRecord>();
		for (const record of snapshot.records) { byRef.set(record.key, record); if (record.id) byRef.set(record.id, record); }
		const target = byRef.get(request.target.key);
		const conflicts: string[] = [];
		if (!target) conflicts.push(`Target not found: ${request.target.key}`);
		const selected = new Map<string, { record: EntityRecord; relationship: string; reasons: string[] }>();
		const visit = (record: EntityRecord, relationship: string, reason: string) => {
			const existing = selected.get(record.key);
			if (existing) { if (!existing.reasons.includes(reason)) existing.reasons.push(reason); return; }
			selected.set(record.key, { record, relationship, reasons: [reason] });
		};
		if (target) {
			visit(target, 'target', '目标对象');
			let frontier = [target];
			const traversed = new Set([target.key]);
			for (let depth = 1; depth <= policy.relationDepth; depth++) {
				const next: EntityRecord[] = [];
				for (const source of frontier) {
					const references = [
						...snapshot.relations.getOutgoing(source.key).map(link => link.toRef),
						...(source.id ? snapshot.relations.getIncoming(source.id) : []).map(link => link.fromKey),
						...snapshot.relations.getIncoming(source.key).map(link => link.fromKey),
					];
					for (const reference of references) {
						const related = byRef.get(reference);
						if (!related || traversed.has(related.key)) continue;
						traversed.add(related.key); next.push(related); visit(related, `relation:${depth}`, `与目标在 ${depth} 跳内相关`);
					}
				}
				frontier = next;
			}
			let events = target.type === 'event' ? [target] : [...selected.values()].map(item => item.record).filter(record => record.type === 'event');
			const seenEvents = new Set(events.map(record => record.key));
			for (let depth = 1; depth <= policy.eventPrerequisiteDepth; depth++) {
				const next: EntityRecord[] = [];
				for (const event of events) for (const reference of values(event.data.prerequisite_event_ids ?? event.data.prerequisiteEventIds)) {
					const prerequisite = byRef.get(reference);
					if (!prerequisite || prerequisite.type !== 'event' || seenEvents.has(prerequisite.key)) continue;
					seenEvents.add(prerequisite.key); next.push(prerequisite); visit(prerequisite, `event-prerequisite:${depth}`, `事件前置链第 ${depth} 层`);
				}
				events = next;
			}
		}
		for (const reference of manualIncluded) { const record = byRef.get(reference); if (record) visit(record, 'manual', '作者手动纳入'); else conflicts.push(`Manual include not found: ${reference}`); }
		for (const reference of manualExcluded) { const record = byRef.get(reference); if (record) visit(record, 'manual', '作者手动排除'); else conflicts.push(`Manual exclude not found: ${reference}`); }

		const items: ContextItem[] = [];
		for (const { record, relationship, reasons } of selected.values()) {
			const reference = record.id || record.key;
			const isExcluded = manualExcluded.has(record.key) || manualExcluded.has(reference);
			const isManual = manualIncluded.has(record.key) || manualIncluded.has(reference);
			const eligible = record.canon === 'canon' && record.lifecycleStatus === 'active' && record.contextScope === 'current';
			if (!isExcluded && !isManual && !eligible) { conflicts.push(`Default governance excluded ${reference}`); continue; }
			if (!isExcluded && isManual && record.lifecycleStatus === 'archived') { conflicts.push(`Archived item cannot be included: ${reference}`); continue; }
			if (!isExcluded && isManual && !eligible) conflicts.push(`Manual governance override: ${reference}`);
			items.push(this.toItem(record, isExcluded ? 'manual_excluded' : isManual ? 'manual_included' : 'auto_included', relationship, reasons, policy));
		}
		const inclusionOrder = { auto_included: 0, manual_included: 1, manual_excluded: 2 } as const;
		items.sort((a, b) => inclusionOrder[a.inclusion] - inclusionOrder[b.inclusion] || a.key.localeCompare(b.key));
		const generatedAt = (request.now || new Date()).toISOString();
		const planId = `CTX-${contentHash(stableSerialize({ target: request.target, snapshot: snapshot.version, policy, manual: request.manual })).slice(-8).toUpperCase()}`;
		return {
			schemaVersion: CONTEXT_SCHEMA_VERSION, planId, target: { kind: request.target.kind, key: request.target.key }, generatedAt,
			snapshotVersion: snapshot.version,
			policy: { relationDepth: policy.relationDepth, eventPrerequisiteDepth: policy.eventPrerequisiteDepth, defaultGovernance: 'canon-active-current' },
			items, conflicts: [...new Set(conflicts)].sort(),
		};
	}

	private toItem(record: EntityRecord, inclusion: ContextItem['inclusion'], relationship: string, reasons: string[], policy: ContextPolicy): ContextItem {
		const data = record.data;
		const knowledge = data.knowledge_state && typeof data.knowledge_state === 'object' && !Array.isArray(data.knowledge_state) ? data.knowledge_state as Record<string, unknown> : undefined;
		const reader = scalar(data.reader_state ?? data.readerState ?? knowledge?.reader, 'unknown');
		const povRaw = knowledge?.povCharacters;
		const pov = povRaw && typeof povRaw === 'object' ? povRaw as Record<string, string> : {};
		const body = scalar(data.synopsis ?? data.summary ?? data.body, '').replace(/^---[\s\S]*?---\s*/u, '').replace(/\s+/g, ' ').trim();
		return {
			key: record.key, id: record.id, path: record.source.path, anchor: record.source.anchor, type: record.type, title: record.title,
			inclusion, reasons: [...new Set(reasons)], relationship, canon: record.canon, lifecycleStatus: record.lifecycleStatus,
			contextScope: record.contextScope, reviewStatus: record.reviewStatus,
			containsUnrevealed: reader !== 'revealed' || values(data.secrets).length > 0,
			knowledgeBoundary: { reader, pov, allowedReveal: policy.allowedReveal || scalar(knowledge?.allowedReveal, '未指定') },
			hasConflict: record.canon === 'conflict' || record.diagnostics.some(diagnostic => diagnostic.severity === 'error'),
			modifiedAt: new Date(record.source.mtime || 0).toISOString(), lastReviewed: record.lastReviewed, summary: body.slice(0, 240),
		};
	}
}
