import { describe, expect, it } from 'vitest';
import { NarrativeTreeQuery } from '../../src/console/application';
import { record, snapshot } from './wave3-fixtures';

describe('NarrativeTreeQuery', () => {
	it('navigates every sparse hierarchy combination without inventing directory levels', () => {
		const book = record('book', 'BOOK-0001', { title: '全书', order: 1 });
		const volume = record('volume', 'VOL-0001', { title: '第一卷', parent_ids: ['BOOK-0001'], order: 1 });
		const chapter = record('chapter', 'CH-0001', { title: '开端', parent_ids: ['VOL-0001'], chapter_no: 1 });
		const directChapter = record('chapter', 'CH-0002', { title: '尾声', parent_ids: ['BOOK-0001'], chapter_no: 2 });
		const result = new NarrativeTreeQuery(() => snapshot(book, volume, chapter, directChapter)).execute();
		expect(result.roots[0]?.children.map(node => node.type)).toEqual(['volume', 'chapter']);
		expect(result.roots[0]?.children[0]?.children[0]).toMatchObject({ key: 'CH-0001', storyCode: 'V01-C001' });
	});

	it('keeps orphaned nodes reachable and diagnoses missing parents and cycles', () => {
		const orphan = record('chapter', 'CH-0001', { parent_ids: ['VOL-9999'], chapter_no: 1 });
		const a = record('unit', 'UNIT-0001', { parent_ids: ['PLN-0001'] });
		const b = record('plan', 'PLN-0001', { parent_ids: ['UNIT-0001'] });
		const result = new NarrativeTreeQuery(() => snapshot(orphan, a, b)).execute();
		expect(result.roots.some(node => node.key === 'CH-0001')).toBe(true);
		expect(result.diagnostics.map(item => item.ruleId)).toEqual(expect.arrayContaining(['STRUCT_CORE_ORPHANED', 'STRUCT_NARRATIVE_CYCLE']));
		expect(new NarrativeTreeQuery(() => undefined).execute()).toEqual({ roots: [], diagnostics: [] });
	});
});
