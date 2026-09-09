import type { DiagnosticRef, EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { StoryCodeService } from '../indexing';

const LEVELS = ['book', 'part', 'volume', 'unit', 'plan', 'chapter'] as const;
type NarrativeType = typeof LEVELS[number];

export interface NarrativeTreeNode {
	key: string;
	type: NarrativeType;
	title: string;
	order?: number;
	storyCode?: string;
	children: NarrativeTreeNode[];
}

export interface NarrativeTreeResult { roots: NarrativeTreeNode[]; diagnostics: DiagnosticRef[] }

const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' && value ? [value] : [];
const numberValue = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined;

export class NarrativeTreeQuery {
	private readonly storyCodes = new StoryCodeService();
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}

	execute(): NarrativeTreeResult {
		const snapshot = this.snapshotProvider();
		if (!snapshot) return { roots: [], diagnostics: [] };
		const records = snapshot.records.filter((record): record is EntityRecord & { type: NarrativeType } => LEVELS.includes(record.type as NarrativeType));
		const byRef = new Map<string, EntityRecord>();
		for (const record of records) { byRef.set(record.key, record); if (record.id) byRef.set(record.id, record); }
		const nodes = new Map(records.map(record => [record.key, this.toNode(record)]));
		const byKey = new Map(records.map(record => [record.key, record]));
		const parentByChild = new Map<string, string>();
		const diagnostics: DiagnosticRef[] = [];
		for (const record of records) {
			const parent = this.parentRefs(record).map(ref => byRef.get(ref)).find(Boolean);
			if (parent && parent.key !== record.key) parentByChild.set(record.key, parent.key);
			else if (this.parentRefs(record).length) diagnostics.push({ ruleId: 'STRUCT_CORE_ORPHANED', severity: 'warning', entityKey: record.key, message: 'Narrative parent is missing.', evidence: [{ path: record.source.path }] });
		}
		for (const record of records) {
			const seen = new Set<string>([record.key]);
			let current = parentByChild.get(record.key);
			while (current) {
				if (seen.has(current)) {
					diagnostics.push({ ruleId: 'STRUCT_NARRATIVE_CYCLE', severity: 'error', entityKey: record.key, message: 'Narrative hierarchy contains a cycle.', evidence: [{ path: record.source.path }] });
					parentByChild.delete(record.key);
					break;
				}
				seen.add(current); current = parentByChild.get(current);
			}
		}
		for (const record of records) if (record.type === 'chapter') nodes.get(record.key)!.storyCode = this.storyCode(record, parentByChild, byKey);
		for (const [child, parent] of parentByChild) nodes.get(parent)?.children.push(nodes.get(child)!);
		const sort = (items: NarrativeTreeNode[]) => { items.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title) || a.key.localeCompare(b.key)); for (const item of items) sort(item.children); };
		const roots = records.filter(record => !parentByChild.has(record.key)).map(record => nodes.get(record.key)!);
		sort(roots);
		return { roots, diagnostics };
	}

	private parentRefs(record: EntityRecord): string[] {
		const data = record.data;
		const explicit = list(data.parent_ids);
		if (explicit.length) return explicit;
		const index = LEVELS.indexOf(record.type as NarrativeType);
		return LEVELS.slice(0, Math.max(0, index)).reverse().flatMap(type => list(data[type]));
	}

	private toNode(record: EntityRecord & { type: NarrativeType }): NarrativeTreeNode {
		const data = record.data;
		return { key: record.key, type: record.type, title: record.title, order: numberValue(data.order), children: [] };
	}

	private storyCode(chapter: EntityRecord, parentByChild: ReadonlyMap<string, string>, byKey: ReadonlyMap<string, EntityRecord>): string | undefined {
		const chapterNo = numberValue(chapter.data.chapter_no ?? chapter.data.chapterNo ?? chapter.data.order);
		if (!chapterNo) return undefined;
		const numbers: { partNo?: number; volumeNo?: number; unitNo?: number; chapterNo: number } = {
			partNo: numberValue(chapter.data.part_no), volumeNo: numberValue(chapter.data.volume_no), unitNo: numberValue(chapter.data.unit_no), chapterNo,
		};
		let parent = parentByChild.get(chapter.key);
		while (parent) {
			const record = byKey.get(parent);
			if (!record) break;
			const order = numberValue(record.data[`${record.type}_no`] ?? record.data.order);
			if (record.type === 'part') numbers.partNo = order;
			else if (record.type === 'volume') numbers.volumeNo = order;
			else if (record.type === 'unit') numbers.unitNo = order;
			parent = parentByChild.get(parent);
		}
		return this.storyCodes.compute(numbers);
	}
}
