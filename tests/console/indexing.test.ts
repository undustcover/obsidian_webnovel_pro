import { describe, expect, it, vi } from 'vitest';
import { ConsoleAdapterRegistry, PropertiesEntityAdapter, type AdapterSource, type EntityAdapter } from '../../src/console/adapters';
import { createDefaultConsoleProject } from '../../src/console/config';
import {
	EntityIndexService, IdRegistry, IndexCache, IndexCoordinator, IndexSnapshot, ProjectScopeResolver,
	StoryCodeService, ConsoleIndexRuntime, hashIndexContent,
} from '../../src/console/indexing';
import { TFile } from '../mocks/obsidian';
import { EntityQuery } from '../../src/console/application';

const adapterSource = (path: string, frontmatter: Record<string, unknown>): AdapterSource => ({
	path, basename: path.split('/').at(-1)?.replace(/\.md$/, '') || '', mtime: 1, contentHash: `hash:${path}`, content: `# ${typeof frontmatter.title === 'string' ? frontmatter.title : 'Title'}`, frontmatter,
});

const adapter = new PropertiesEntityAdapter();
const registry = new ConsoleAdapterRegistry([adapter]);
const project = createDefaultConsoleProject('作品');

describe('Wave 1 indexing', () => {
	it('registers IDs, reports duplicates/type mismatches, and allocates the next simple ID', () => {
		const records = [
			...adapter.parse(adapterSource('作品/a.md', { type: 'character', id: 'CHR-0002', title: 'A' })),
			...adapter.parse(adapterSource('作品/b.md', { type: 'character', id: 'CHR-0002', title: 'B' })),
			...adapter.parse(adapterSource('作品/c.md', { type: 'character', id: 'EVT-0003', title: 'C' })),
		];
		const ids = new IdRegistry(records);
		expect(ids.resolve('CHR-0002')).toBeUndefined();
		expect(ids.nextCandidate('character')).toBe('CHR-0003');
		expect(ids.nextCandidate('chapter_revision')).toBeUndefined();
		expect(ids.diagnostics.map((item) => item.ruleId)).toEqual(expect.arrayContaining(['STRUCT_ID_DUPLICATE', 'STRUCT_ID_TYPE_MISMATCH']));
	});

	it('computes story codes while skipping missing levels', () => {
		const service = new StoryCodeService();
		expect(service.compute({ volumeNo: 2, chapterNo: 12 })).toBe('V02-C012');
		expect(service.compute({ partNo: 1, volumeNo: 2, unitNo: 3, chapterNo: 12 })).toBe('P01-V02-U03-C012');
		expect(() => service.compute({ chapterNo: 0 })).toThrow(RangeError);
	});

	it('limits project scope on path boundaries', () => {
		const scope = new ProjectScopeResolver();
		expect(scope.filter(project, ['作品/a.md', '作品集/b.md', '作品'])).toEqual(['作品/a.md', '作品']);
	});

	it('builds one immutable snapshot, isolates bad files, and never writes through the source port', async () => {
		const sources = [
			adapterSource('作品/a.md', { type: 'character', id: 'CHR-0001', title: '林澈', aliases: ['阿澈'], events: ['EVT-0001'] }),
			adapterSource('其他/b.md', { type: 'character', id: 'CHR-0002', title: '越界' }),
		];
		const sourcePort = { listMarkdownFiles: vi.fn().mockResolvedValue(sources) };
		const service = new EntityIndexService(sourcePort, registry);
		const states: string[] = [];
		service.onState((state) => states.push(state.status));
		const snapshot = await service.build(project);
		expect(snapshot.records).toHaveLength(1);
		expect(snapshot.idRegistry.resolve('CHR-0001')?.title).toBe('林澈');
		expect(snapshot.relations.getOutgoing('CHR-0001')[0]?.toRef).toBe('EVT-0001');
		expect(snapshot.search({ query: '阿澈' }).total).toBe(1);
		expect(states).toContain('indexing');
		expect(service.getState().status).toBe('idle');
	});

	it('keeps the last complete build usable when one adapter throws', async () => {
		const throwingAdapter: EntityAdapter = {
			id: 'throwing', canParse: () => true,
			parse: (source) => { if (source.path.endsWith('bad.md')) throw new Error('broken source'); return adapter.parse(source); },
		};
		const sourcePort = { listMarkdownFiles: vi.fn().mockResolvedValue([
			adapterSource('作品/good.md', { type: 'character', id: 'CHR-0001', title: 'Good' }),
			adapterSource('作品/bad.md', { type: 'character', id: 'CHR-0002', title: 'Bad' }),
		]) };
		const service = new EntityIndexService(sourcePort, new ConsoleAdapterRegistry([throwingAdapter]), undefined, async () => {});
		const snapshot = await service.build(project);
		expect(snapshot.records.map(record => record.id)).toEqual(['CHR-0001']);
		expect(snapshot.diagnostics[0]?.ruleId).toBe('INDEX_SOURCE_PARSE_FAILED');
		expect(service.getState()).toMatchObject({ status: 'degraded', failedPaths: ['作品/bad.md'] });
	});

	it('supports combined filters, deterministic paging, and incoming links', () => {
		const records = [
			...adapter.parse(adapterSource('作品/a.md', { type: 'character', id: 'CHR-0001', title: '乙', events: ['EVT-0001'] })),
			...adapter.parse(adapterSource('作品/b.md', { type: 'event', id: 'EVT-0001', title: '甲' })),
		];
		const snapshot = new IndexSnapshot('v1', 'p1', records);
		expect(snapshot.search({ filters: { types: ['character'], canon: ['canon'] }, pageSize: 1 })).toMatchObject({ total: 1, pageSize: 1 });
		expect(snapshot.relations.affectedByTarget('EVT-0001')).toEqual(['CHR-0001']);
		const query = new EntityQuery(() => snapshot);
		expect(query.execute({ query: '乙', filters: { types: ['character'] } }).items[0]?.id).toBe('CHR-0001');
		expect(new EntityQuery(() => undefined).execute({ page: 0, pageSize: 500 })).toMatchObject({ total: 0, page: 1, pageSize: 200 });
	});

	it('round-trips valid cache and ignores corrupt or incompatible cache', async () => {
		let content: string | null = null;
		const port = { read: vi.fn(async () => content), write: vi.fn(async (value: string) => { content = value; }), remove: vi.fn(async () => { content = null; }) };
		const cache = new IndexCache(port);
		const snapshot = new IndexSnapshot('v1', 'p1', adapter.parse(adapterSource('作品/a.md', { type: 'character', id: 'CHR-0001', title: 'A' })));
		await cache.save(snapshot);
		expect((await cache.load())?.records[0]?.id).toBe('CHR-0001');
		expect(content).not.toContain('"body"');
		content = '{bad';
		expect(await cache.load()).toBeNull();
		content = JSON.stringify({ schemaVersion: 'old' });
		expect(await cache.load()).toBeNull();
		await cache.clear();
		expect(content).toBeNull();
	});

	it('applies create/modify/delete/rename incrementally without listing all files', async () => {
		const sourcePort = { listMarkdownFiles: vi.fn().mockResolvedValue([]) };
		const service = new EntityIndexService(sourcePort, registry);
		await service.build(project);
		const coordinator = new IndexCoordinator(service);
		coordinator.apply(project, { type: 'create', source: adapterSource('作品/a.md', { type: 'character', id: 'CHR-0001', title: 'A' }) });
		expect(service.getSnapshot()?.records).toHaveLength(1);
		coordinator.apply(project, { type: 'rename', oldPath: '作品/a.md', source: adapterSource('作品/moved.md', { type: 'character', id: 'CHR-0001', title: 'A' }) });
		expect(service.getSnapshot()?.records[0]?.source.path).toBe('作品/moved.md');
		coordinator.apply(project, { type: 'delete', path: '作品/moved.md' });
		expect(service.getSnapshot()?.records).toHaveLength(0);
		expect(sourcePort.listMarkdownFiles).toHaveBeenCalledTimes(1);
	});

	it('reports only the changed source and its inbound referrers for incremental diagnostics', async () => {
		const sourcePort = { listMarkdownFiles: vi.fn().mockResolvedValue([
			adapterSource('作品/a.md', { type: 'character', id: 'CHR-0001', title: 'A', events: ['EVT-0001'] }),
			adapterSource('作品/e.md', { type: 'event', id: 'EVT-0001', title: 'E' }),
		]) };
		const service = new EntityIndexService(sourcePort, registry, undefined, async () => {});
		await service.build(project);
		const coordinator = new IndexCoordinator(service);
		coordinator.apply(project, { type: 'modify', source: adapterSource('作品/e.md', { type: 'event', id: 'EVT-0001', title: 'E2' }) });
		expect(coordinator.getLastAffectedEntityKeys()).toEqual(['CHR-0001', 'EVT-0001']);
		expect(sourcePort.listMarkdownFiles).toHaveBeenCalledTimes(1);
	});

	it('disposes coordinator and index listeners idempotently so later events are ignored', async () => {
		const service = new EntityIndexService({ listMarkdownFiles: vi.fn().mockResolvedValue([]) }, registry);
		await service.build(project);
		const states = vi.fn();
		const snapshots = vi.fn();
		service.onState(states);
		service.onSnapshot(snapshots);
		const coordinator = new IndexCoordinator(service);
		coordinator.dispose();
		coordinator.dispose();
		expect(coordinator.apply(project, { type: 'create', source: adapterSource('作品/a.md', { type: 'character', id: 'CHR-0001' }) })).toBeUndefined();
		service.restore(new IndexSnapshot('restored', project.projectId, []));
		service.onState(states);
		expect(states).not.toHaveBeenCalled();
		expect(snapshots).not.toHaveBeenCalled();
		expect(coordinator.getLastAffectedEntityKeys()).toEqual([]);
	});

	it('maintains isolated project snapshots and caches while file events stay incremental', async () => {
		const first = new TFile('a.md', '作品一/a.md');
		first.stat = { mtime: 1 };
		const second = new TFile('b.md', '作品二/b.md');
		second.stat = { mtime: 1 };
		const contents = new Map([
			[first.path, '# A'], [second.path, '# B'],
		]);
		const frontmatter = new Map<string, Record<string, unknown>>([
			[first.path, { type: 'character', id: 'CHR-0001', title: 'A' }],
			[second.path, { type: 'event', id: 'EVT-0001', title: 'B' }],
		]);
		const cacheFiles = new Map<string, string>();
		const cacheWrite = vi.fn(async (path: string, value: string) => { cacheFiles.set(path, value); });
		const getMarkdownFiles = vi.fn(() => [first, second]);
		const plugin = {
			manifest: { id: 'test-console', dir: 'plugins/test-console' },
			settings: { consoleProjects: [createDefaultConsoleProject('作品一', 0), createDefaultConsoleProject('作品二', 1)] },
			app: {
				vault: {
					getMarkdownFiles,
					cachedRead: vi.fn(async (file: TFile) => contents.get(file.path) || ''),
					adapter: {
						exists: vi.fn(async (path: string) => cacheFiles.has(path)),
						read: vi.fn(async (path: string) => cacheFiles.get(path) || ''),
						write: cacheWrite,
						remove: vi.fn(async (path: string) => { cacheFiles.delete(path); }),
					},
				},
				metadataCache: { getFileCache: vi.fn((file: TFile) => ({ frontmatter: frontmatter.get(file.path) })) },
			},
		} as never;
		const runtime = new ConsoleIndexRuntime(plugin);
		expect(runtime.getConfigDiagnostics()).toEqual([]);
		await runtime.initialize();
		expect(runtime.getProjectIds()).toEqual(['project-1', 'project-2']);
		expect(runtime.getIndex('project-1')?.getSnapshot()?.records[0]?.id).toBe('CHR-0001');
		expect(runtime.getIndex('project-2')?.getSnapshot()?.records[0]?.id).toBe('EVT-0001');
		expect(cacheFiles.size).toBe(2);

		frontmatter.set(first.path, { type: 'character', id: 'CHR-0001', title: 'A2' });
		contents.set(first.path, '# A2');
		await runtime.handleFileEvent({ type: 'modify', file: first });
		expect(runtime.getIndex('project-1')?.getSnapshot()?.records[0]?.title).toBe('A2');
		expect(runtime.getIndex('project-2')?.getSnapshot()?.records[0]?.title).toBe('B');
		expect(getMarkdownFiles).toHaveBeenCalledTimes(2);
		expect(hashIndexContent('# A2')).not.toBe(hashIndexContent('# A'));

		cacheWrite.mockRejectedValueOnce(new Error('disk full'));
		await runtime.handleFileEvent({ type: 'modify', file: first });
		expect(runtime.getCacheError('project-1')).toBe('disk full');
		expect(runtime.getIndex('project-1')?.getSnapshot()?.records[0]?.title).toBe('A2');
	});

	it('destroys every runtime context without deleting cache or responding to later file events', async () => {
		const file = new TFile('a.md', '作品/a.md');
		file.stat = { mtime: 1 };
		const remove = vi.fn().mockResolvedValue(undefined);
		const cachedRead = vi.fn().mockResolvedValue('# A');
		const plugin = {
			manifest: { id: 'test-console', dir: 'plugins/test-console' },
			settings: { consoleProjects: [createDefaultConsoleProject('作品')] },
			app: {
				vault: { getMarkdownFiles: () => [file], cachedRead, adapter: { exists: vi.fn().mockResolvedValue(false), read: vi.fn(), write: vi.fn(), remove } },
				metadataCache: { getFileCache: () => ({ frontmatter: { type: 'character', id: 'CHR-0001', title: 'A' } }) },
			},
		} as never;
		const runtime = new ConsoleIndexRuntime(plugin);
		await runtime.initialize();
		const oldIndex = runtime.getIndex('project-1');
		const oldVersion = oldIndex?.getSnapshot()?.version;
		runtime.destroy();
		runtime.destroy();
		await runtime.handleFileEvent({ type: 'modify', file });
		expect(runtime.getProjectIds()).toEqual([]);
		expect(runtime.getIndex('project-1')).toBeUndefined();
		expect(oldIndex?.getSnapshot()?.version).toBe(oldVersion);
		expect(remove).not.toHaveBeenCalled();
		expect(cachedRead).toHaveBeenCalledTimes(1);
	});

	it('refreshes created and modified paths from current Markdown when metadata cache is stale', async () => {
		const files: TFile[] = [];
		const contents = new Map<string, string>();
		const cacheFiles = new Map<string, string>();
		const plugin = {
			manifest: { id: 'test-console', dir: 'plugins/test-console' },
			settings: { consoleProjects: [{ ...createDefaultConsoleProject('作品'), projectId: 'p1' }] },
			app: {
				vault: {
					getMarkdownFiles: () => [...files],
					getAbstractFileByPath: (path: string) => files.find(file => file.path === path) || null,
					cachedRead: async (file: TFile) => contents.get(file.path) || '',
					adapter: {
						exists: async (path: string) => cacheFiles.has(path), read: async (path: string) => cacheFiles.get(path) || '',
						write: async (path: string, value: string) => { cacheFiles.set(path, value); }, remove: async (path: string) => { cacheFiles.delete(path); },
					},
				},
				metadataCache: { getFileCache: () => ({ frontmatter: { type: 'event', id: 'EVT-0002', title: 'stale', event_status: 'planned' } }) },
			},
		} as never;
		const runtime = new ConsoleIndexRuntime(plugin);
		await runtime.initialize();
		const created = new TFile('EVT-0002.md', '作品/事件数据库/EVT-0002.md'); created.stat = { mtime: 2 }; files.push(created);
		contents.set(created.path, '---\ntype: event\nid: EVT-0002\ntitle: "夜访钟楼"\nevent_status: planned\nstoryline: protagonist\n---\n');

		await runtime.refreshPaths([created.path]);
		expect(runtime.getIndex('p1')?.getSnapshot()?.idRegistry.resolve('EVT-0002')).toMatchObject({ title: '夜访钟楼', data: { event_status: 'planned' } });

		created.stat = { mtime: 3 };
		contents.set(created.path, contents.get(created.path)!.replace('event_status: planned', 'event_status: occurred'));
		await runtime.refreshPaths([created.path]);
		expect(runtime.getIndex('p1')?.getSnapshot()?.idRegistry.resolve('EVT-0002')?.data.event_status).toBe('occurred');
	});
});
