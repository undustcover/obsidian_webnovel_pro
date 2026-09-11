import { describe, expect, it, vi } from 'vitest';
import { TFile } from 'obsidian';
import { ChapterSorter } from '../../src/services/ChapterSorter';
import { analyzeSplitContent, combineTemplateAndSuffix } from '../../src/services/ChapterSplitter';
import { ChapterMergeManager, type ChapterMergeItem } from '../../src/services/ChapterMergeManager';
import type { WebNovelAssistantPlugin } from '../../src/types/plugin';

function file(path: string): TFile {
	const value = new TFile();
	value.path = path;
	value.name = path.split('/').at(-1)!;
	value.basename = value.name.replace(/\.md$/, '');
	return value;
}

describe('AC-17 stable chapter anchors', () => {
	it('split keeps source anchors and gives the target a fresh CH ID without copying template anchors', () => {
		const source = '---\ntype: chapter\nid: CH-0007\nevent_ids: [EVT-0011]\ntask: TSK-0003\nforeshadowing: FSH-0002\n---\n上半章。\n下半章。';
		const cursor = source.indexOf('下半章');
		const analysis = analyzeSplitContent(source, cursor);
		const template = '---\ntype: chapter\nid: CH-0001\nevent_ids: [EVT-0999]\nrevision_ids: [REV-CH-0001-01]\ntags: [正文]\n---\n';
		const targetTemplate = ChapterSorter.protectSplitTemplate(template, 'CH-0008');
		const target = combineTemplateAndSuffix(targetTemplate, analysis.suffix).content;

		expect(ChapterSorter.inspectStableAnchors(source)).toEqual({
			chapterId: 'CH-0007', referenceIds: ['EVT-0011', 'FSH-0002', 'TSK-0003']
		});
		expect(ChapterSorter.inspectStableAnchors(target)).toEqual({ chapterId: 'CH-0008', referenceIds: [] });
		expect(target).not.toContain('CH-0001');
		expect(target).not.toContain('EVT-0999');
		expect(target).toContain('tags: [正文]');
	});

	it('reserves monotonically increasing IDs across insertions in one session', () => {
		const first = ChapterSorter.reserveNextChapterId(['CH-0002', 'CH-0010']);
		const second = ChapterSorter.reserveNextChapterId(['CH-0002', 'CH-0010']);
		expect(Number(first.slice(3))).toBeGreaterThanOrEqual(11);
		expect(Number(second.slice(3))).toBe(Number(first.slice(3)) + 1);
	});

	it('sorting changes order without changing IDs or EVT/TSK/FSH anchors', () => {
		const contents = new Map([
			['第10章.md', '---\nid: CH-0010\nevent_ids: [EVT-0010]\n---\n十'],
			['第2章.md', '---\nid: CH-0002\ntask_ids: [TSK-0002]\nforeshadowing_ids: [FSH-0002]\n---\n二']
		]);
		const files = [...contents.keys()].map(file);
		const before = new Map(files.map(item => [item.path, ChapterSorter.inspectStableAnchors(contents.get(item.path)!)]));
		const sorted = ChapterSorter.sortFiles(files);
		expect(sorted.map(item => item.name)).toEqual(['第2章.md', '第10章.md']);
		for (const item of files) expect(ChapterSorter.inspectStableAnchors(contents.get(item.path)!)).toEqual(before.get(item.path));
	});

	it('merge body save preserves frontmatter anchors', async () => {
		const chapter = file('Novel/第1章.md');
		const original = '---\nid: CH-0001\nevent_ids: [EVT-0001]\ntask_ids: [TSK-0001]\n---\n旧正文';
		const modify = vi.fn();
		const plugin = {
			app: { vault: {
				adapter: { exists: vi.fn().mockResolvedValue(false), read: vi.fn(), write: vi.fn(), remove: vi.fn() },
				cachedRead: vi.fn().mockResolvedValue(original), modify,
				getAbstractFileByPath: vi.fn(), create: vi.fn()
			} },
			manifest: { dir: 'plugins/test', id: 'test' }, calculateAccurateWords: vi.fn()
		} as unknown as WebNovelAssistantPlugin;
		const manager = new ChapterMergeManager(plugin);
		const item: ChapterMergeItem = {
			file: chapter, volumeName: '', title: '第1章',
			frontmatter: '---\nid: CH-0001\nevent_ids: [EVT-0001]\ntask_ids: [TSK-0001]\n---',
			originalBody: '旧正文', currentBody: '新正文', annotation: '', originalAnnotation: '', isModified: true,
			stableAnchors: ChapterSorter.inspectStableAnchors(original)
		};
		await manager.saveToOriginalFiles([item]);
		const written = modify.mock.calls[0][1] as string;
		expect(ChapterSorter.inspectStableAnchors(written)).toEqual(ChapterSorter.inspectStableAnchors(original));
	});

	it('merge aborts instead of overwriting a concurrent anchor change', async () => {
		const chapter = file('Novel/第1章.md');
		const modify = vi.fn();
		const plugin = {
			app: { vault: {
				adapter: { exists: vi.fn().mockResolvedValue(false), read: vi.fn(), write: vi.fn(), remove: vi.fn() },
				cachedRead: vi.fn().mockResolvedValue('---\nid: CH-0001\nevent_ids: [EVT-0002]\n---\n并发修改'), modify,
				getAbstractFileByPath: vi.fn(), create: vi.fn()
			} }, manifest: { dir: 'plugins/test', id: 'test' }, calculateAccurateWords: vi.fn()
		} as unknown as WebNovelAssistantPlugin;
		const manager = new ChapterMergeManager(plugin);
		const item: ChapterMergeItem = {
			file: chapter, volumeName: '', title: '第1章', frontmatter: '---\nid: CH-0001\nevent_ids: [EVT-0001]\n---',
			originalBody: '旧', currentBody: '新', annotation: '', originalAnnotation: '', isModified: true,
			stableAnchors: { chapterId: 'CH-0001', referenceIds: ['EVT-0001'] }
		};
		await expect(manager.saveToOriginalFiles([item])).rejects.toThrow('CHAPTER_STABLE_ANCHOR_CONFLICT:Novel/第1章.md');
		expect(modify).not.toHaveBeenCalled();
	});

	it('preflights the whole merge batch before writing when a later chapter conflicts', async () => {
		const first = file('Novel/第1章.md');
		const second = file('Novel/第2章.md');
		const modify = vi.fn();
		const disk = new Map([
			[first.path, '---\nid: CH-0001\nevent_ids: [EVT-0001]\n---\n一'],
			[second.path, '---\nid: CH-0002\nevent_ids: [EVT-0099]\n---\n二'],
		]);
		const plugin = {
			app: { vault: {
				adapter: { exists: vi.fn().mockResolvedValue(false), read: vi.fn(), write: vi.fn(), remove: vi.fn() },
				cachedRead: vi.fn(async (target: TFile) => disk.get(target.path) || ''), modify,
				getAbstractFileByPath: vi.fn(), create: vi.fn()
			} }, manifest: { dir: 'plugins/test', id: 'test' }, calculateAccurateWords: vi.fn()
		} as unknown as WebNovelAssistantPlugin;
		const manager = new ChapterMergeManager(plugin);
		const item = (target: TFile, chapterId: string, eventId: string): ChapterMergeItem => ({
			file: target, volumeName: '', title: target.basename,
			frontmatter: `---\nid: ${chapterId}\nevent_ids: [${eventId}]\n---`,
			originalBody: '旧', currentBody: '新', annotation: '', originalAnnotation: '', isModified: true,
			stableAnchors: { chapterId, referenceIds: [eventId] }
		});
		await expect(manager.saveToOriginalFiles([
			item(first, 'CH-0001', 'EVT-0001'), item(second, 'CH-0002', 'EVT-0002')
		])).rejects.toThrow('CHAPTER_STABLE_ANCHOR_CONFLICT:Novel/第2章.md');
		expect(modify).not.toHaveBeenCalled();
	});
});
