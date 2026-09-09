import type { ChangePlan } from '../domain';
import type { IndexSnapshot } from '../indexing';
import type { MarkdownPlanningPort } from './MarkdownChangePlanner';
import type { MarkdownChangePlanner } from './MarkdownChangePlanner';

export const CHAPTER_EDITABLE_FIELDS = new Set(['title', 'synopsis', 'status', 'pov', 'event_ids', 'revision_ids', 'parent_ids', 'book', 'part', 'volume', 'unit', 'order', 'chapter_no']);

function yamlValue(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(item => JSON.stringify(String(item))).join(', ')}]`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(String(value));
}

function updateFrontmatter(content: string, patch: Record<string, unknown>): string {
	const normalized = content.replace(/\r\n/g, '\n');
	const end = normalized.startsWith('---\n') ? normalized.indexOf('\n---', 4) : -1;
	const body = end >= 0 ? normalized.slice(end + 4).replace(/^\n/, '') : normalized;
	const sourceLines = end >= 0 ? normalized.slice(4, end).split('\n') : [];
	const output: string[] = [];
	const consumed = new Set<string>();
	let skipIndented = false;
	for (const line of sourceLines) {
		const match = line.match(/^([\w\-\u3400-\u9fff]+):/u);
		if (match) {
			skipIndented = false;
			if (match[1] in patch) { output.push(`${match[1]}: ${yamlValue(patch[match[1]])}`); consumed.add(match[1]); skipIndented = true; }
			else output.push(line);
		} else if (!skipIndented || !/^\s+/.test(line)) {
			skipIndented = false;
			output.push(line);
		}
	}
	for (const key of Object.keys(patch).sort()) if (!consumed.has(key)) output.push(`${key}: ${yamlValue(patch[key])}`);
	return `---\n${output.join('\n')}\n---\n${body}`;
}

export class ChapterWorkspaceCommandService {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined, private readonly port: MarkdownPlanningPort, private readonly planner: MarkdownChangePlanner) {}
	async planUpdate(chapterKey: string, patch: Record<string, unknown>, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const snapshot = this.snapshotProvider();
		if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		const chapter = snapshot.byKey.get(chapterKey) || snapshot.idRegistry.resolve(chapterKey);
		if (!chapter || chapter.type !== 'chapter') throw new Error('CHAPTER_NOT_FOUND');
		for (const key of Object.keys(patch)) if (!CHAPTER_EDITABLE_FIELDS.has(key)) throw new Error(`CHAPTER_FIELD_NOT_EDITABLE:${key}`);
		const current = await this.port.read(chapter.source.path);
		if (!current) throw new Error('CHAPTER_SOURCE_NOT_FOUND');
		return this.planner.plan({
			type: 'update-entity-fields', actor: 'author', requestedAt, targetKeys: [chapter.id || chapter.key],
			payload: { mutations: [{ path: chapter.source.path, operation: 'modify', content: updateFrontmatter(current.content, patch) }] },
		}, snapshot.version);
	}
}
