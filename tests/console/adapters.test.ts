import { describe, expect, it } from 'vitest';
import {
	FieldResolver, LegacyChapterAdapter, LegacyForeshadowingAdapter, LegacyLoreAdapter,
	LegacyTimedTaskAdapter, LegacyTimelineAdapter, PropertiesEntityAdapter,
	type AdapterSource,
} from '../../src/console/adapters';
import { ENTITY_TYPES } from '../../src/console/domain';

const source = (overrides: Partial<AdapterSource>): AdapterSource => ({
	path: '作品/文件.md', basename: '文件', mtime: 1, contentHash: 'hash', content: '', ...overrides,
});

describe('console adapters', () => {
	it('resolves canonical, project and built-in aliases and reports conflicts', () => {
		const resolver = new FieldResolver({ title: ['项目标题'] });
		const result = resolver.resolve({ title: 'A', 项目标题: 'B', 名称: 'C' }, 'title');
		expect(result.value).toBe('A');
		expect(result.conflict).toBe(true);
		expect(resolver.conflictDiagnostic('CHR-0001', 'a.md', 'title', result)?.evidence).toHaveLength(3);
	});

	it('normalizes Properties while preserving explicit unknown values and raw data', () => {
		const record = new PropertiesEntityAdapter().parse(source({
			path: '作品/人物.md', basename: '人物', content: '# 回退标题',
			frontmatter: { type: '人物', id: 'CHR-0001', 名称: '林澈', alias: '阿澈, 小林', canon: 'experimental' },
		}))[0];
		expect(record).toMatchObject({ id: 'CHR-0001', type: 'character', title: '林澈', aliases: ['阿澈', '小林'], canon: 'unknown' });
		expect(record?.raw.canon).toBe('experimental');
		expect(record?.diagnostics.map((item) => item.ruleId)).toContain('STRUCT_ENUM_UNKNOWN');
	});

	it('recognizes every canonical P0 entity type without inventing IDs', () => {
		const adapter = new PropertiesEntityAdapter();
		for (const type of ENTITY_TYPES) {
			const record = adapter.parse(source({ frontmatter: { type, title: type } }))[0];
			expect(record?.type, type).toBe(type);
		}
	});

	it('parses a legacy chapter without inventing an ID', () => {
		const record = new LegacyChapterAdapter().parse(source({ path: '作品/正文/第1章.md', basename: '第1章', frontmatter: { Synopsis: '开场', Status: '草稿', timeline: 'Day 1' } }))[0];
		expect(record?.id).toBeUndefined();
		expect(record).toMatchObject({ type: 'chapter', data: { synopsis: '开场', status: '草稿', timeline: 'Day 1' } });
	});

	it('parses legacy lore H2 entries and aliases', () => {
		const records = new LegacyLoreAdapter().parse(source({ path: '作品/设定/人物.md', content: '## 林澈\n**Alias**: 阿澈, 小林\n\n## 苏弥\n' }));
		expect(records.map((item) => item.title)).toEqual(['林澈', '苏弥']);
		expect(records[0]?.aliases).toEqual(['阿澈', '小林']);
	});

	it('parses modern and old legacy timeline blocks', () => {
		const records = new LegacyTimelineAdapter().parse(source({ path: '作品/时间线.md', content: '---\n## Day 1\n**Type**：事件\n\n- 抵达 [[第1章]]\n  后续描述\n---\n## Before\n\n古老事件。\n' }));
		expect(records).toHaveLength(2);
		expect(records[0]?.data).toMatchObject({ time: 'Day 1', chapters: ['第1章'] });
		expect(records[1]?.data).toMatchObject({ time: 'Before', description: '古老事件。' });
	});

	it('parses legacy foreshadowing recovery and timed tasks', () => {
		const foreshadowing = new LegacyForeshadowingAdapter().parse(source({ path: '作品/伏笔.md', content: '## 信纸\n> [[第1章]] - 2026-01-01\n> 水印\n\n**标签**：#线索\n**状态**：阶段回收中\n- [终结] [[第20章]] - 2026-02-01：揭示\n---\n' }))[0];
		const task = new LegacyTimedTaskAdapter().parse(source({ path: '作品/限时任务.md', content: '## 第1期\n\n**平台**：自我督促\n**任务**：日更\n**状态**：进行中\n\n---\n' }))[0];
		expect(foreshadowing?.data.recoveryLogs).toEqual([{ stageType: 'final', file: '第20章', time: '2026-02-01', note: '揭示' }]);
		expect(task?.data).toMatchObject({ period: 1, platform: '自我督促', position: '日更', status: '进行中' });
	});
});
