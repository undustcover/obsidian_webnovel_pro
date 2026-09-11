import {
	EVENT_STATUSES, IMPORTANCE_LEVELS, NARRATIVE_STATUSES, READER_STATES,
	type ChangePlan, type EntityRecord, type EventData, type Importance, type StoryTime, type TimelineViewConfig,
} from '../domain';
import type { ConsoleProjectConfig } from '../config';
import type { IndexSnapshot } from '../indexing';
import type { MarkdownChangePlanner, MarkdownPlanningPort } from './MarkdownChangePlanner';

export interface NewEvent { id: string; title: string; data: EventData }

const join = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
const value = (data: Record<string, unknown>, ...keys: string[]): unknown => keys.find(key => data[key] !== undefined) ? data[keys.find(key => data[key] !== undefined)!] : undefined;
const text = (input: unknown, fallback = ''): string => typeof input === 'string' ? input : fallback;
const number = (input: unknown): number | undefined => typeof input === 'number' && Number.isFinite(input) ? input : undefined;
const list = (input: unknown): string[] => Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string') : typeof input === 'string' && input ? [input] : [];
const enumValue = <T extends string>(input: unknown, allowed: readonly T[]): T | 'unknown' => typeof input === 'string' && allowed.includes(input as T) ? input as T : 'unknown';

function storyTime(input: unknown): StoryTime | undefined {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
	const source = input as Record<string, unknown>;
	if (typeof source.display !== 'string' || !source.display) return undefined;
	const precision = enumValue(source.precision, ['instant', 'day', 'month', 'season', 'year', 'era', 'relative'] as const);
	return { display: source.display, precision, ...(typeof source.sortKey === 'string' ? { sortKey: source.sortKey } : {}), ...(typeof source.calendar === 'string' ? { calendar: source.calendar } : {}) };
}

function viewConfig(input: unknown): TimelineViewConfig | undefined {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
	const source = input as Record<string, unknown>;
	return { visible: source.visible === true, importance: enumValue(source.importance, IMPORTANCE_LEVELS) };
}

function importanceMap(input: unknown): Record<string, Importance | 'unknown'> {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
	return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, item]) => [key, enumValue(item, IMPORTANCE_LEVELS)]));
}

export function eventDataFromRecord(record: EntityRecord): EventData {
	if (record.type !== 'event') throw new Error('EVENT_NOT_FOUND');
	const data = record.data;
	const views = (value(data, 'timeline_views', 'timelineViews') || {}) as Record<string, unknown>;
	const knowledge = (value(data, 'knowledge_state', 'knowledgeState') || {}) as Record<string, unknown>;
	const pov = (value(knowledge, 'pov_characters', 'povCharacters') || {}) as Record<string, unknown>;
	return {
		eventStatus: enumValue(value(data, 'event_status', 'eventStatus', 'status'), EVENT_STATUSES),
		narrativeStatus: enumValue(value(data, 'narrative_status', 'narrativeStatus'), NARRATIVE_STATUSES),
		readerState: enumValue(value(data, 'reader_state', 'readerState'), READER_STATES),
		storyTime: storyTime(value(data, 'story_time', 'storyTime')),
		storyTimeEnd: value(data, 'story_time_end', 'storyTimeEnd') === null ? null : storyTime(value(data, 'story_time_end', 'storyTimeEnd')),
		timelineOrder: number(value(data, 'timeline_order', 'timelineOrder')),
		storyline: text(data.storyline), prerequisiteEventIds: list(value(data, 'prerequisite_event_ids', 'prerequisiteEventIds')),
		currentPlanIds: list(value(data, 'current_plan_ids', 'currentPlanIds')), currentChapterIds: list(value(data, 'current_chapter_ids', 'currentChapterIds')),
		characterIds: list(value(data, 'character_ids', 'characterIds')), organizationIds: list(value(data, 'organization_ids', 'organizationIds')),
		locationIds: list(value(data, 'location_ids', 'locationIds')), itemIds: list(value(data, 'item_ids', 'itemIds')),
		timelineViews: { reality: viewConfig(views.reality), hiddenWorld: viewConfig(value(views, 'hidden_world', 'hiddenWorld')), cosmic: viewConfig(views.cosmic), characters: importanceMap(views.characters), organizations: importanceMap(views.organizations) },
		knowledgeState: { author: 'full', reader: enumValue(knowledge.reader, READER_STATES), povCharacters: Object.fromEntries(Object.entries(pov).map(([key, item]) => [key, enumValue(item, ['unknown', 'hinted', 'partial', 'full', 'misled'] as const)])), ...(typeof value(knowledge, 'allowed_reveal', 'allowedReveal') === 'string' ? { allowedReveal: value(knowledge, 'allowed_reveal', 'allowedReveal') as string } : {}) },
		causes: list(data.causes), results: list(data.results), longTermImpacts: list(value(data, 'long_term_impacts', 'longTermImpacts')), evidenceFiles: list(value(data, 'evidence_files', 'evidenceFiles')),
	};
}

function validate(data: EventData): void {
	if (!data.storyline.trim()) throw new Error('INVALID_EVENT_STORYLINE');
	// reader_state legitimately includes "unknown"; event/narrative use it only as a parse-failure branch.
	if (data.eventStatus === 'unknown' || data.narrativeStatus === 'unknown') throw new Error('INVALID_EVENT_STATE');
	if (data.eventStatus === 'occurring' && !data.storyTime) throw new Error('EVENT_TIME_REQUIRED_FOR_OCCURRING');
}

const json = (input: unknown): string => JSON.stringify(input);
function render(id: string, title: string, data: EventData, body = `# ${title}\n`): string {
	validate(data);
	const views = { reality: data.timelineViews.reality, hidden_world: data.timelineViews.hiddenWorld, cosmic: data.timelineViews.cosmic, characters: data.timelineViews.characters, organizations: data.timelineViews.organizations };
	const lines = ['---', 'type: event', `id: ${id}`, `title: ${json(title)}`, `event_status: ${data.eventStatus}`, `narrative_status: ${data.narrativeStatus}`, `reader_state: ${data.readerState}`, `storyline: ${json(data.storyline)}`];
	if (data.storyTime) lines.push(`story_time: ${json(data.storyTime)}`);
	if (data.storyTimeEnd !== undefined) lines.push(`story_time_end: ${json(data.storyTimeEnd)}`);
	if (data.timelineOrder !== undefined) lines.push(`timeline_order: ${data.timelineOrder}`);
	lines.push(`prerequisite_event_ids: ${json(data.prerequisiteEventIds)}`, `current_plan_ids: ${json(data.currentPlanIds)}`, `current_chapter_ids: ${json(data.currentChapterIds)}`, `character_ids: ${json(data.characterIds)}`, `organization_ids: ${json(data.organizationIds)}`, `location_ids: ${json(data.locationIds)}`, `item_ids: ${json(data.itemIds)}`, `timeline_views: ${json(views)}`, `knowledge_state: ${json({ author: 'full', reader: data.knowledgeState.reader, pov_characters: data.knowledgeState.povCharacters, allowed_reveal: data.knowledgeState.allowedReveal })}`, `causes: ${json(data.causes)}`, `results: ${json(data.results)}`, `long_term_impacts: ${json(data.longTermImpacts)}`, `evidence_files: ${json(data.evidenceFiles)}`, '---', '', body.replace(/^\s+/, '').replace(/\s*$/, ''), '');
	return lines.join('\n');
}

function markdownBody(content: string): string {
	const normalized = content.replace(/\r\n/g, '\n');
	if (!normalized.startsWith('---\n')) return normalized;
	const end = normalized.indexOf('\n---', 4);
	return end < 0 ? normalized : normalized.slice(end + 4).replace(/^\n+/, '');
}

const safeName = (title: string): string => [...title].map(character => character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character).join('').trim().slice(0, 80) || '未命名事件';

export class EventRepository {
	constructor(private snapshotProvider: () => IndexSnapshot | undefined, private project: ConsoleProjectConfig, private port: MarkdownPlanningPort, private planner: MarkdownChangePlanner) {}
	read(key: string): { record: EntityRecord; data: EventData } | null {
		const snapshot = this.snapshotProvider();
		const record = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key);
		return record?.type === 'event' ? { record, data: eventDataFromRecord(record) } : null;
	}
	async planCreate(input: NewEvent, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const snapshot = this.snapshotProvider();
		if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		if (!/^EVT-\d{4,}$/.test(input.id)) throw new Error('INVALID_EVENT_ID');
		if (snapshot.idRegistry.resolve(input.id)) throw new Error('EVENT_ID_EXISTS');
		const path = join(this.project.root, this.project.directories.events, `${input.id}-${safeName(input.title)}.md`);
		return this.planner.plan({ type: 'create-entity', actor: 'author', requestedAt, targetKeys: [input.id], payload: { mutations: [{ path, operation: 'create', content: render(input.id, input.title, input.data) }] } }, snapshot.version);
	}
	async planUpdate(key: string, data: EventData, requestedAt = new Date().toISOString(), commandType = 'update-entity-fields'): Promise<ChangePlan> {
		const current = this.read(key);
		const snapshot = this.snapshotProvider();
		if (!snapshot) throw new Error('INDEX_UNAVAILABLE');
		if (!current?.record.id) throw new Error('EVENT_NOT_FOUND');
		const source = await this.port.read(current.record.source.path);
		if (!source) throw new Error('EVENT_SOURCE_NOT_FOUND');
		return this.planner.plan({ type: commandType, actor: 'author', requestedAt, targetKeys: [current.record.id], payload: { mutations: [{ path: current.record.source.path, operation: 'modify', content: render(current.record.id, current.record.title, data, markdownBody(source.content)) }] } }, snapshot.version);
	}
}
