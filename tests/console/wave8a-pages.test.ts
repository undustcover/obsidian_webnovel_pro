import { describe, expect, it, vi } from 'vitest';
import type { IndexSnapshot } from '../../src/console/indexing';
import { queryPageEntities } from '../../src/console/ui/GenericEntityPage';
import { renderCharacterCenterDetails, renderGenericRecordDetails, renderItemCenterDetails } from '../../src/console/ui/EntityCenterDetails';
import { CharacterCenterQuery, ItemCenterQuery } from '../../src/console/application';
import { FakeElement } from './fake-element';
import { eventRecord } from './wave4-fixtures';
import { record, snapshot } from './wave3-fixtures';

const appFor = (snap: IndexSnapshot) => ({ search: (request: Parameters<IndexSnapshot['search']>[0]) => snap.search(request) });

describe('Wave 8A page semantics', () => {
	it('never leaks unrelated lore or material records between pages', () => {
		const character = record('character', 'CHR-0001');
		const item = record('item', 'ITM-0001');
		const reference = record('unknown', undefined, { title: '参考', type: 'reference' }); reference.raw = { type: 'reference' };
		const idea = record('unknown', undefined, { title: '灵感', type: '灵感' }); idea.raw = { type: '灵感' };
		const other = record('unknown', undefined, { title: '未知', type: 'other' }); other.raw = { type: 'other' };
		const app = appFor(snapshot(character, item, reference, idea, other));
		expect(queryPageEntities(app as never, 'lore/characters').map(entry => entry.type)).toEqual(['character']);
		expect(queryPageEntities(app as never, 'lore/items').map(entry => entry.type)).toEqual(['item']);
		expect(queryPageEntities(app as never, 'materials/references')).toEqual([reference]);
		expect(queryPageEntities(app as never, 'materials/ideas')).toEqual([idea]);
		expect(queryPageEntities(app as never, 'materials/references', '不存在')).toEqual([]);
		const exactLorePages = {
			'lore/worlds': 'world', 'lore/characters': 'character', 'lore/organizations': 'organization',
			'lore/locations': 'location', 'lore/items': 'item', 'lore/abilities': 'ability', 'lore/terms': 'term',
		} as const;
		const loreSnapshot = snapshot(...Object.values(exactLorePages).map((type, index) => record(type, `${type.toUpperCase()}-${String(index + 1).padStart(4, '0')}`)));
		for (const [page, type] of Object.entries(exactLorePages)) expect(queryPageEntities(appFor(loreSnapshot) as never, page as keyof typeof exactLorePages).every(entry => entry.type === type)).toBe(true);
	});

	it('renders character and item evidence instead of count-only details', () => {
		const character = record('character', 'CHR-0001', { current_location_id: 'LOC-9999', story_status: 'active' }, ['ORG-0001']);
		const item = record('item', 'ITM-0001', { current_holder_ids: ['CHR-0001', 'CHR-0002'], holder_history: [{ holder: 'CHR-0001', event: 'EVT-0001' }] });
		const chapter = record('chapter', 'CH-0001');
		const event = eventRecord('EVT-0001', { characterIds: ['CHR-0001'], itemIds: ['ITM-0001'], currentChapterIds: ['CH-0001'] });
		const snap = snapshot(character, item, chapter, event);
		const characterRoot = new FakeElement();
		const itemRoot = new FakeElement();
		renderCharacterCenterDetails(characterRoot as unknown as HTMLElement, new CharacterCenterQuery(() => snap).execute('CHR-0001')!, vi.fn());
		renderItemCenterDetails(itemRoot as unknown as HTMLElement, new ItemCenterQuery(() => snap).execute('ITM-0001')!, vi.fn());
		expect(characterRoot.textContent).toContain('current_location_id：LOC-9999');
		expect(characterRoot.textContent).toContain('CURRENT_LOCATION_NOT_FOUND');
		expect(characterRoot.textContent).toContain('related → ORG-0001');
		expect(itemRoot.textContent).toContain('CHR-0001');
		expect(itemRoot.textContent).toContain('EVT-0001');
		expect(itemRoot.textContent).toContain('MULTIPLE_CURRENT_HOLDERS');
	});

	it('renders source-safe core fields for the other lore types without body text', () => {
		const root = new FakeElement();
		const world = record('world', 'WLD-0001', { era: '星历', description: '公开摘要', body: '长正文不应进入详情' }, ['TERM-0001']);
		renderGenericRecordDetails(root as unknown as HTMLElement, world);
		expect(root.textContent).toContain('era：星历');
		expect(root.textContent).toContain('related → TERM-0001');
		expect(root.textContent).not.toContain('长正文不应进入详情');
	});
});
