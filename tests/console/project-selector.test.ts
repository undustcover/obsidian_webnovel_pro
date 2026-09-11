import { describe, expect, it, vi } from 'vitest';
import { ConsoleApplication } from '../../src/console/application';
import { renderProjectSelector, resolveProjectSelection } from '../../src/console/ui';
import { FakeElement } from './fake-element';
import { record, snapshot } from './wave3-fixtures';

describe('Console project selector', () => {
	it('covers zero, one and many project display states', () => {
		const emptyRoot = new FakeElement();
		const empty = renderProjectSelector(emptyRoot as unknown as HTMLElement, [], undefined, vi.fn());
		expect(empty.disabled).toBe(true);
		expect(emptyRoot.textContent).toContain('未配置项目');
		const one = renderProjectSelector(new FakeElement() as unknown as HTMLElement, ['p1'], 'p1', vi.fn());
		expect(one.disabled).toBe(true);
		expect(one.value).toBe('p1');
		const many = renderProjectSelector(new FakeElement() as unknown as HTMLElement, ['p1', 'p2'], 'p2', vi.fn());
		expect(many.disabled).toBe(false);
		expect(many.value).toBe('p2');
	});

	it('recovers an invalid persisted project id to the runtime active project or first project', () => {
		expect(resolveProjectSelection(['p1', 'p2'], 'missing', 'p2')).toEqual({ projectId: 'p2', recovered: true });
		expect(resolveProjectSelection(['p1', 'p2'], 'missing', 'also-missing')).toEqual({ projectId: 'p1', recovered: true });
		expect(resolveProjectSelection([], 'missing', 'p1')).toEqual({ projectId: undefined, recovered: true });
	});

	it('uses a native select change to request a project switch', () => {
		const onSelect = vi.fn();
		const select = renderProjectSelector(new FakeElement() as unknown as HTMLElement, ['p1', 'p2'], 'p1', onSelect) as unknown as FakeElement;
		select.value = 'p2';
		select.dispatch('change');
		expect(onSelect).toHaveBeenCalledWith('p2');
	});

	it('switches status counts and query data through the same application boundary', () => {
		const snapshots = {
			p1: snapshot(record('chapter', 'CH-0001', { title: '项目一章节' })),
			p2: snapshot(record('chapter', 'CH-0002', { title: '项目二章节' }), record('character', 'CHR-0002', { title: '项目二人物' })),
		};
		let active: keyof typeof snapshots = 'p1';
		const runtime = {
			getProjectIds: () => ['p1', 'p2'],
			getActiveProjectId: () => active,
			setActiveProject: (projectId: string) => { if (!(projectId in snapshots)) return false; active = projectId as keyof typeof snapshots; return true; },
			getIndex: () => ({ getState: () => ({ status: 'idle' }), getSnapshot: () => snapshots[active] }),
			getConfigDiagnostics: () => [],
			getCacheError: () => undefined,
		};
		const app = new ConsoleApplication(runtime as never, { plan: vi.fn() } as never, { execute: vi.fn() } as never, { issue: vi.fn() } as never);
		expect(app.getIndexState()).toMatchObject({ projectId: 'p1', recordCount: 1 });
		expect(app.search({ query: '', page: 1, pageSize: 10 }).items.map(item => item.title)).toEqual(['项目一章节']);
		expect(app.setActiveProject('p2')).toBe(true);
		expect(app.getIndexState()).toMatchObject({ projectId: 'p2', recordCount: 2 });
		expect(app.search({ query: '', page: 1, pageSize: 10 }).items.map(item => item.title)).toEqual(['项目二人物', '项目二章节']);
	});
});
