import type { EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';

export interface ChapterWorkspace {
	chapter?: EntityRecord;
	plan?: EntityRecord;
	revisions: EntityRecord[];
	events: EntityRecord[];
	characters: EntityRecord[];
	organizations: EntityRecord[];
	locations: EntityRecord[];
	items: EntityRecord[];
	foreshadowing: EntityRecord[];
	tasks: EntityRecord[];
	diagnostics: string[];
}

const refs = (record: EntityRecord | undefined): Set<string> => new Set(record ? record.links.map(link => link.toRef) : []);

export class ChapterWorkspaceQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}
	execute(chapterKey: string): ChapterWorkspace {
		const snapshot = this.snapshotProvider();
		const empty: ChapterWorkspace = { revisions: [], events: [], characters: [], organizations: [], locations: [], items: [], foreshadowing: [], tasks: [], diagnostics: [] };
		if (!snapshot) return { ...empty, diagnostics: ['INDEX_UNAVAILABLE'] };
		const chapter = snapshot.byKey.get(chapterKey) || snapshot.idRegistry.resolve(chapterKey);
		if (!chapter || chapter.type !== 'chapter') return { ...empty, diagnostics: ['CHAPTER_NOT_FOUND'] };
		const chapterRefs = refs(chapter);
		const chapterId = chapter.id || chapter.key;
		const related = (record: EntityRecord) => refs(record).has(chapterId) || chapterRefs.has(record.id || record.key);
		const ofType = (type: EntityRecord['type']) => snapshot.records.filter(record => record.type === type && related(record));
		return {
			chapter, plan: ofType('plan')[0], revisions: ofType('chapter_revision'), events: ofType('event'),
			characters: ofType('character'), organizations: ofType('organization'), locations: ofType('location'),
			items: ofType('item'), foreshadowing: ofType('foreshadowing'), tasks: ofType('task'), diagnostics: [],
		};
	}
}
