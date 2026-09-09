import { describe, expect, it } from 'vitest';
import { ManuscriptQuery } from '../../src/console/application';
import { record, snapshot } from './wave3-fixtures';

describe('ManuscriptQuery', () => {
	it('projects chapters and revisions while keeping synopsis separate from body', () => {
		const chapter = record('chapter', 'CH-0001', { title: '旧章', status: 'published', synopsis: '策划摘要', body: '正文秘密', revision_ids: ['REV-CH-0001-01'], chapter_no: 2, pov: ['CHR-0001'], event_ids: ['EVT-0001'] });
		const revision = record('chapter_revision', 'REV-CH-0001-01', { title: '修订一' });
		const draft = record('chapter', 'CH-0002', { title: '新章', status: 'draft', chapter_no: 1 });
		const query = new ManuscriptQuery(() => snapshot(chapter, revision, draft));
		expect(query.execute().map(item => item.key)).toEqual(['CH-0002', 'CH-0001']);
		expect(query.execute({ status: 'published', query: '策划' })[0]).toMatchObject({ synopsis: '策划摘要', revisions: [revision], pov: ['CHR-0001'] });
		expect(query.execute({ query: '正文秘密' })).toEqual([]);
		expect(new ManuscriptQuery(() => undefined).execute()).toEqual([]);
	});
});
