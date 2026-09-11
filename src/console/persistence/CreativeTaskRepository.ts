import { ACTIVATION_RELATIONS, TASK_STATUSES, canTransitionTaskStatus, type ChangePlan, type CreativeTaskData, type EntityRecord, type TaskActivation } from '../domain';
import type { ConsoleProjectConfig } from '../config';
import type { IndexSnapshot } from '../indexing';
import type { MarkdownChangePlanner, MarkdownPlanningPort } from './MarkdownChangePlanner';

const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const enumValue = <T extends string>(value: unknown, allowed: readonly T[]): T | 'unknown' => typeof value === 'string' && allowed.includes(value as T) ? value as T : 'unknown';
const normalizeActivation = (value: unknown): TaskActivation => {
	const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
	const relation = enumValue(data.relation, ACTIVATION_RELATIONS);
	if (relation === 'between') return { relation, anchorType: data.anchor_type === 'milestone' ? 'milestone' : 'event', startAnchorId: text(data.start_anchor_id), endAnchorId: text(data.end_anchor_id) };
	if (relation === 'blocked_by') return { relation, anchorType: data.anchor_type === 'event' ? 'event' : 'task', blockerIds: list(data.blocker_ids) };
	return { relation: relation === 'unknown' ? 'at' : relation, anchorType: data.anchor_type === 'milestone' ? 'milestone' : 'event', anchorId: text(data.anchor_id) };
};

export function creativeTaskDataFromRecord(record: EntityRecord): CreativeTaskData {
	if (record.type !== 'task' || record.data.legacyKind) throw new Error('CREATIVE_TASK_NOT_FOUND');
	const data = record.data;
	const dueAt = typeof data.due_at === 'string' ? data.due_at : typeof data.dueAt === 'string' ? data.dueAt : undefined;
	return { taskKind: text(data.task_kind) || text(data.taskKind), status: enumValue(data.status, TASK_STATUSES), priority: enumValue(data.priority, ['low', 'normal', 'high', 'critical'] as const), relatedObjectIds: list(data.related_object_ids || data.relatedObjectIds), activation: normalizeActivation(data.activation), blockedByIds: list(data.blocked_by_ids || data.blockedByIds), ...(dueAt ? { dueAt } : {}) };
}

function validate(data: CreativeTaskData): void {
	if (!data.taskKind.trim() || data.status === 'unknown' || data.priority === 'unknown') throw new Error('INVALID_CREATIVE_TASK');
	const activation = data.activation;
	if ('anchorId' in activation && !activation.anchorId) throw new Error('INVALID_TASK_ANCHOR');
	if (activation.relation === 'between' && (!activation.startAnchorId || !activation.endAnchorId)) throw new Error('INVALID_TASK_ANCHOR');
	if (activation.relation === 'blocked_by' && !activation.blockerIds.length) throw new Error('INVALID_TASK_BLOCKERS');
}
const safe = (value: string) => [...value].map(char => char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '-' : char).join('').trim().slice(0, 80) || '未命名任务';
const render = (id: string, title: string, data: CreativeTaskData, body = `# ${title}`) => { validate(data); return ['---', 'type: task', `id: ${id}`, `title: ${JSON.stringify(title)}`, `task_kind: ${JSON.stringify(data.taskKind)}`, `status: ${data.status}`, `priority: ${data.priority}`, `related_object_ids: ${JSON.stringify(data.relatedObjectIds)}`, `activation: ${JSON.stringify(data.activation).replace(/"anchorType":/g, '"anchor_type":').replace(/"anchorId":/g, '"anchor_id":').replace(/"startAnchorId":/g, '"start_anchor_id":').replace(/"endAnchorId":/g, '"end_anchor_id":').replace(/"blockerIds":/g, '"blocker_ids":')}`, `blocked_by_ids: ${JSON.stringify(data.blockedByIds)}`, ...(data.dueAt ? [`due_at: ${JSON.stringify(data.dueAt)}`] : []), '---', '', body.trim(), ''].join('\n'); };
const bodyOf = (content: string) => { const normalized = content.replace(/\r\n/g, '\n'); const end = normalized.startsWith('---\n') ? normalized.indexOf('\n---', 4) : -1; return end < 0 ? normalized : normalized.slice(end + 4).replace(/^\n+/, ''); };
const join = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

export class CreativeTaskRepository {
	constructor(private snapshotProvider: () => IndexSnapshot | undefined, private project: ConsoleProjectConfig, private port: MarkdownPlanningPort, private planner: MarkdownChangePlanner) {}
	read(key: string) { const snapshot = this.snapshotProvider(); const record = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key); return record?.type === 'task' && !record.data.legacyKind ? { record, data: creativeTaskDataFromRecord(record) } : null; }
	async planCreate(id: string, title: string, data: CreativeTaskData, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const snapshot = this.snapshotProvider(); if (!snapshot) throw new Error('INDEX_UNAVAILABLE'); if (!/^TSK-\d{4,}$/.test(id)) throw new Error('INVALID_TASK_ID'); if (snapshot.idRegistry.resolve(id)) throw new Error('TASK_ID_EXISTS');
		return this.planner.plan({ type: 'create-entity', actor: 'author', requestedAt, targetKeys: [id], payload: { mutations: [{ path: join(this.project.root, this.project.directories.control, '创作任务', `${id}-${safe(title)}.md`), operation: 'create', content: render(id, title, data) }] } }, snapshot.version);
	}
	async planUpdate(key: string, data: CreativeTaskData, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const current = this.read(key); const snapshot = this.snapshotProvider(); if (!snapshot) throw new Error('INDEX_UNAVAILABLE'); if (!current?.record.id) throw new Error('CREATIVE_TASK_NOT_FOUND'); const source = await this.port.read(current.record.source.path); if (!source) throw new Error('TASK_SOURCE_NOT_FOUND');
		const plan = await this.planner.plan({ type: 'update-entity-fields', actor: 'author', requestedAt, targetKeys: [current.record.id], payload: { mutations: [{ path: current.record.source.path, operation: 'modify', content: render(current.record.id, current.record.title, data, bodyOf(source.content)) }] } }, snapshot.version); return plan;
	}
	async planDelete(key: string, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const current = this.read(key); const snapshot = this.snapshotProvider();
		if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		if (!current?.record.id) throw new Error('CREATIVE_TASK_NOT_FOUND');
		return this.planner.plan({ type: 'delete-entity', actor: 'author', requestedAt, targetKeys: [current.record.id], payload: { mutations: [{ path: current.record.source.path, operation: 'delete' }], warnings: ['删除创作任务不可由 Console 自动裁决；执行前请核对引用与影响报告。'] } }, snapshot.version);
	}
	async planStatus(key: string, to: CreativeTaskData['status'], requestedAt?: string): Promise<ChangePlan> { const current = this.read(key); if (!current || to === 'unknown') throw new Error('CREATIVE_TASK_NOT_FOUND'); if (!canTransitionTaskStatus(current.data.status, to)) throw new Error('TASK_TRANSITION_NOT_ALLOWED'); const plan = await this.planUpdate(key, { ...current.data, status: to }, requestedAt); plan.fieldDiffs = [{ path: current.record.source.path, field: 'status', before: current.data.status, after: to }]; return plan; }
}
