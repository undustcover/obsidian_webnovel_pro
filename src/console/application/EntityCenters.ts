import type { EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { eventDataFromRecord } from '../persistence';

export interface CharacterCenter { character: EntityRecord; events: EntityRecord[]; chapters: EntityRecord[]; conflicts: string[] }
export interface ItemCenter { item: EntityRecord; currentHolders: string[]; holderHistory: unknown[]; events: EntityRecord[]; chapters: EntityRecord[]; conflicts: string[] }
const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const eventSort = (a: EntityRecord, b: EntityRecord) => { const left = eventDataFromRecord(a); const right = eventDataFromRecord(b); if (left.storyTime?.sortKey && right.storyTime?.sortKey && left.storyTime.calendar === right.storyTime.calendar) return left.storyTime.sortKey.localeCompare(right.storyTime.sortKey); return (left.timelineOrder ?? Number.MAX_SAFE_INTEGER) - (right.timelineOrder ?? Number.MAX_SAFE_INTEGER) || a.key.localeCompare(b.key); };

export class CharacterCenterQuery {
	constructor(private snapshotProvider: () => IndexSnapshot | undefined) {}
	execute(key: string): CharacterCenter | null { const snapshot = this.snapshotProvider(); const character = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key); if (!snapshot || character?.type !== 'character') return null; const id = character.id || character.key; const events = snapshot.records.filter(record => record.type === 'event' && eventDataFromRecord(record).characterIds.includes(id)).sort(eventSort); const chapters = snapshot.records.filter(record => record.type === 'chapter' && (ids(record.data.character_ids).includes(id) || events.some(event => eventDataFromRecord(event).currentChapterIds.includes(record.id || record.key)))); const location = character.data.current_location_id; const conflicts = typeof location === 'string' && !snapshot.idRegistry.resolve(location) ? ['CURRENT_LOCATION_NOT_FOUND'] : []; return { character, events, chapters, conflicts }; }
}

export class ItemCenterQuery {
	constructor(private snapshotProvider: () => IndexSnapshot | undefined) {}
	execute(key: string): ItemCenter | null { const snapshot = this.snapshotProvider(); const item = snapshot?.byKey.get(key) || snapshot?.idRegistry.resolve(key); if (!snapshot || item?.type !== 'item') return null; const id = item.id || item.key; const events = snapshot.records.filter(record => record.type === 'event' && eventDataFromRecord(record).itemIds.includes(id)).sort(eventSort); const chapters = snapshot.records.filter(record => record.type === 'chapter' && events.some(event => eventDataFromRecord(event).currentChapterIds.includes(record.id || record.key))); const currentHolders = ids(item.data.current_holder_ids || item.data.currentHolderIds); const conflicts = currentHolders.length > 1 ? ['MULTIPLE_CURRENT_HOLDERS'] : []; return { item, currentHolders, holderHistory: Array.isArray(item.data.holder_history) ? item.data.holder_history : [], events, chapters, conflicts }; }
}
