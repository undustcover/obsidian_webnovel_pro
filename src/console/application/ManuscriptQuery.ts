import type { EntityRecord } from '../domain';
import type { IndexSnapshot } from '../indexing';

export interface ManuscriptChapter {
	key: string; title: string; sourcePath: string; chapterNo?: number; status: string;
	synopsis: string; pov: string[]; eventIds: string[]; revisions: EntityRecord[];
}

export interface ManuscriptQueryRequest { status?: string; query?: string }

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : typeof value === 'string' ? [value] : [];
const scalar = (value: unknown, fallback: string): string => ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : fallback;

export class ManuscriptQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}
	execute(request: ManuscriptQueryRequest = {}): ManuscriptChapter[] {
		const records = this.snapshotProvider()?.records || [];
		const revisions = records.filter(record => record.type === 'chapter_revision');
		return records.filter(record => record.type === 'chapter').map(record => {
			const data = record.data;
			const ids = strings(data.revision_ids);
			return {
				key: record.key, title: record.title, sourcePath: record.source.path,
				chapterNo: Number.isFinite(Number(data.chapter_no)) ? Number(data.chapter_no) : undefined,
				status: scalar(data.status, 'unknown'), synopsis: scalar(data.synopsis, ''),
				pov: strings(data.pov), eventIds: strings(data.event_ids),
				revisions: revisions.filter(revision => ids.includes(revision.id || revision.key) || revision.data.chapter_id === (record.id || record.key)),
			};
		}).filter(chapter => (!request.status || chapter.status === request.status) && (!request.query || `${chapter.title}\n${chapter.synopsis}`.toLocaleLowerCase().includes(request.query.toLocaleLowerCase())))
			.sort((a, b) => (a.chapterNo ?? Number.MAX_SAFE_INTEGER) - (b.chapterNo ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title));
	}
}
