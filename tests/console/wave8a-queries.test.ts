import { describe, expect, it } from 'vitest';
import { AUDIT_SCHEMA_VERSION } from '../../src/console/domain';
import { ChangesQuery, ControlOverviewQuery, IdRegistryQuery, NarrativeLevelQuery } from '../../src/console/application';
import { AuditRepository } from '../../src/console/persistence';
import { buildTemplatePageItems } from '../../src/console/ui/TemplatesPage';
import { record, snapshot } from './wave3-fixtures';

describe('Wave 8A read-only queries', () => {
	it('reuses one snapshot for view counts and novel structure', () => {
		const snap = snapshot(record('book', 'BOOK-0001'), record('chapter', 'CH-0001'), record('character', 'CHR-0001'));
		const query = new ControlOverviewQuery(() => snap);
		expect(query.execute()).toMatchObject({ projectId: 'project-1', totalRecords: 3, counts: { book: 1, chapter: 1, character: 1 } });
		const dashboard = { configured: true, storylineCursors: {}, indexStatus: 'ready', availability: { status: 'ready', code: 'INDEX_READY', projectId: 'project-1', message: 'ready', retryable: false, suggestedActions: [], snapshotVersion: 's', recordCount: 3 } as const, healthCount: 0, actionGroups: { now: [], missed: [], upcoming: [], later: [], needs_confirmation: [] } };
		expect(query.executeNovel(dashboard).narrativeCounts).toEqual({ book: 1, part: 0, volume: 0, unit: 0, plan: 0, chapter: 1 });
		expect(new ControlOverviewQuery(() => undefined).execute()).toEqual({ projectId: undefined, snapshotVersion: undefined, totalRecords: 0, counts: {} });
	});

	it('sorts sanitized audit history and marks recovery entries', async () => {
		const records = [
			{ schemaVersion: AUDIT_SCHEMA_VERSION, auditId: 'A1', planId: 'P1', commandType: 'modify', actor: 'author' as const, startedAt: '2026-01-01', targetKeys: [], paths: [], fieldDiffs: [], result: 'succeeded' as const, snapshotBefore: 's1' },
			{ schemaVersion: AUDIT_SCHEMA_VERSION, auditId: 'A2', planId: 'P2', commandType: 'modify', actor: 'author' as const, startedAt: '2026-01-02', targetKeys: [], paths: [], fieldDiffs: [], result: 'manual_recovery_required' as const, snapshotBefore: 's1', errorCode: 'WRITE_FAILED' },
		];
		const repository = new AuditRepository({ read: async () => JSON.stringify({ schemaVersion: AUDIT_SCHEMA_VERSION, records }), write: async () => undefined });
		const result = await new ChangesQuery(repository).execute();
		expect(result.map(item => item.auditId)).toEqual(['A2', 'A1']);
		expect(result[0].recoveryAvailable).toBe(true);
		expect(JSON.stringify(result)).not.toContain('markdown');
		expect(await new ChangesQuery().execute()).toEqual([]);
	});

	it('reports occupied, missing, duplicate, bad-format and next candidate ids', () => {
		const duplicateA = record('character', 'CHR-0001');
		const duplicateB = { ...record('character', 'CHR-0001'), key: 'duplicate-character', source: { ...duplicateA.source, path: '作品/duplicate.md' } };
		const missing = record('character', undefined, { title: '无 ID 人物' });
		const bad = record('item', 'CHR-0099');
		const result = new IdRegistryQuery(() => snapshot(duplicateA, duplicateB, missing, bad)).execute();
		const characters = result.byType.find(item => item.type === 'character')!;
		expect(characters.duplicateIds).toEqual(['CHR-0001']);
		expect(characters.missing).toHaveLength(1);
		// A mismatched but occupied CHR id is still reserved project-wide.
		expect(characters.nextCandidate).toBe('CHR-0100');
		expect(result.byType.find(item => item.type === 'item')!.formatIssues).toHaveLength(1);
		expect(new IdRegistryQuery(() => snapshot(record('chapter_revision', 'REV-CH-0001-01'))).execute().byType.find(item => item.type === 'chapter_revision')?.nextCandidate).toBeUndefined();
	});

	it('filters all six narrative levels while retaining sparse ancestry and cycle diagnostics', () => {
		const book = record('book', 'BOOK-0001');
		const unit = record('unit', 'UNIT-0001', { parent_ids: ['BOOK-0001'] });
		const chapter = record('chapter', 'CH-0001', { parent_ids: ['UNIT-0001'], chapter_no: 1 });
		const orphan = record('plan', 'PLN-0001', { parent_ids: ['VOL-9999'] });
		const volume = record('volume', 'VOL-0001', { parent_ids: ['PART-0001'] });
		const part = record('part', 'PART-0001', { parent_ids: ['VOL-0001'] });
		const snap = snapshot(book, unit, chapter, orphan, volume, part);
		const query = new NarrativeLevelQuery(() => snap);
		expect(query.execute('chapter').items[0].ancestors.map(item => item.type)).toEqual(['book', 'unit']);
		for (const level of ['book', 'part', 'volume', 'unit', 'plan', 'chapter'] as const) expect(query.execute(level).items.every(item => item.node.type === level)).toBe(true);
		expect(query.execute('plan').diagnostics.some(item => item.ruleId === 'STRUCT_CORE_ORPHANED')).toBe(true);
		expect(query.execute('part').diagnostics.some(item => item.ruleId === 'STRUCT_NARRATIVE_CYCLE')).toBe(true);
	});

	it('merges indexed and configured templates and preserves bad paths', () => {
		const indexed = record('template', undefined, { title: '正文模板' });
		indexed.source = { ...indexed.source, path: '模板/正文.md' };
		const items = buildTemplatePageItems([indexed], ['模板/正文.md', '模板/缺失.md'], path => path === '模板/正文.md');
		expect(items).toHaveLength(2);
		expect(items.find(item => item.path === '模板/缺失.md')).toMatchObject({ valid: false, source: 'chapter-setting' });
		expect(buildTemplatePageItems([], [], () => false)).toEqual([]);
	});
});
