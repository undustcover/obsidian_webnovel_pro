import type { ActionGroup, CreativeTaskData, EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';
import type { ProjectState } from '../persistence';
import { creativeTaskDataFromRecord, eventDataFromRecord } from '../persistence';
import { EventGraph } from './EventGraph';

export interface ActionItem { key: string; title: string; group: ActionGroup; source: 'creative_task' | 'legacy_timed_task' | 'suggestion' | 'foreshadowing'; reason: string; anchorIds: string[]; priority: string }
const terminal = (record: EntityRecord) => ['completed', 'cancelled', '已完成', '已取消'].includes(String(record.data.status));

export class ActionProjectionService {
	constructor(private snapshot: IndexSnapshot, private state: ProjectState | null, private threshold = 2) {}
	project(): ActionItem[] {
		return this.snapshot.records.filter(record => record.type === 'task').flatMap(record => record.data.legacyKind ? this.legacy(record) : this.creative(record));
	}
	private creative(record: EntityRecord): ActionItem[] {
		const data = creativeTaskDataFromRecord(record); if (terminal(record)) return [];
		if (data.status === 'blocked' || data.blockedByIds.some(id => !this.isResolved(id))) return [this.item(record, data, 'now', '存在未解除阻塞')];
		const anchors = this.anchors(data); if (!anchors.length || anchors.some(id => !this.snapshot.idRegistry.resolve(id))) return [this.item(record, data, 'needs_confirmation', '激活锚点无效')];
		const anchor = this.snapshot.idRegistry.resolve(anchors[0]); if (anchor?.type !== 'event') return [this.item(record, data, 'later', '里程碑锚点等待正式状态')];
		const event = eventDataFromRecord(anchor); const cursor = this.state?.storylineCursors[event.storyline];
		if (!cursor) return [this.item(record, data, 'later', '剧情线未配置游标')];
		const graph = new EventGraph(this.snapshot); const forward = graph.distance(cursor, anchor.id!);
		const relation = data.activation.relation;
		if ((relation === 'at' && cursor === anchor.id) || (relation === 'after' && (cursor === anchor.id || graph.distance(anchor.id!, cursor).kind === 'distance')) || (relation === 'before' && forward.kind === 'distance' && forward.distance === 0)) return [this.item(record, data, 'now', '激活条件已满足')];
		if ((relation === 'approaching' || relation === 'before') && forward.kind === 'distance' && forward.distance >= 1 && forward.distance <= this.threshold) return [this.item(record, data, 'upcoming', `距锚点 ${forward.distance} 步`)];
		const passed = graph.distance(anchor.id!, cursor); if (passed.kind === 'distance' && passed.distance > 0) return [this.item(record, data, 'missed', '同线游标已越过锚点')];
		return [this.item(record, data, 'later', forward.kind === 'indeterminate' ? forward.reason : '尚未接近锚点')];
	}
	private legacy(record: EntityRecord): ActionItem[] { if (terminal(record)) return []; const due = typeof record.data.endDate === 'string' ? Date.parse(record.data.endDate) : NaN; const group: ActionGroup = Number.isFinite(due) && due < Date.now() ? 'missed' : 'later'; return [{ key: record.key, title: record.title, group, source: 'legacy_timed_task', reason: Number.isFinite(due) ? String(record.data.endDate) : '旧限时任务', anchorIds: [], priority: 'normal' }]; }
	private anchors(data: CreativeTaskData): string[] { const activation = data.activation; if ('anchorId' in activation) return [activation.anchorId]; if (activation.relation === 'between') return [activation.startAnchorId, activation.endAnchorId]; return activation.blockerIds; }
	private isResolved(id: string): boolean { const record = this.snapshot.idRegistry.resolve(id); return record?.type === 'task' ? terminal(record) : record?.type === 'event' ? eventDataFromRecord(record).eventStatus === 'occurred' : false; }
	private item(record: EntityRecord, data: CreativeTaskData, group: ActionGroup, reason: string): ActionItem { return { key: record.id || record.key, title: record.title, group, source: 'creative_task', reason, anchorIds: this.anchors(data), priority: data.priority }; }
}
