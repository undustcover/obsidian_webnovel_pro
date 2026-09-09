import { describe, expect, it } from 'vitest';
import { ChapterWorkspaceQuery } from '../../src/console/application';
import { record, snapshot } from './wave3-fixtures';

describe('ChapterWorkspaceQuery', () => {
	it('aggregates all ten optional chapter relations from either direction', () => {
		const chapter = record('chapter', 'CH-0001', { title: '第一章' }, ['PLN-0001', 'EVT-0001', 'CHR-0001', 'ORG-0001', 'LOC-0001', 'ITM-0001']);
		const records = [
			chapter, record('plan', 'PLN-0001'), record('event', 'EVT-0001'), record('character', 'CHR-0001'), record('organization', 'ORG-0001'),
			record('location', 'LOC-0001'), record('item', 'ITM-0001'), record('chapter_revision', 'REV-CH-0001-01', {}, ['CH-0001']),
			record('foreshadowing', 'FSH-0001', {}, ['CH-0001']), record('task', 'TSK-0001', {}, ['CH-0001']),
		];
		const model = new ChapterWorkspaceQuery(() => snapshot(...records)).execute('CH-0001');
		expect([model.plan, ...model.revisions, ...model.events, ...model.characters, ...model.organizations, ...model.locations, ...model.items, ...model.foreshadowing, ...model.tasks].filter(Boolean)).toHaveLength(9);
		expect(model.diagnostics).toEqual([]);
	});

	it('returns explicit empty states for missing index, chapter, and legacy chapter keys', () => {
		expect(new ChapterWorkspaceQuery(() => undefined).execute('CH-1').diagnostics).toEqual(['INDEX_UNAVAILABLE']);
		const legacy = record('chapter', undefined, { title: '旧章' });
		const query = new ChapterWorkspaceQuery(() => snapshot(legacy));
		expect(query.execute('bad').diagnostics).toEqual(['CHAPTER_NOT_FOUND']);
		expect(query.execute(legacy.key).chapter).toBe(legacy);
	});
});
