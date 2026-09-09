import { describe, expect, it, vi } from 'vitest';
import { MarkdownChangePlanner, type MarkdownPlanningPort } from '../../src/console/persistence';

describe('MarkdownChangePlanner', () => {
	it('plans deterministic create/modify/move/delete changes without writing', async () => {
		const read = vi.fn(async (path: string) => {
			const files: Record<string, { mtime: number; content: string }> = {
				'a.md': { mtime: 1, content: '---\nstatus: planned\n---\nold-a' }, 'b.md': { mtime: 2, content: 'old-b' }, 'c.md': { mtime: 3, content: 'old-c' },
			};
			return files[path] || null;
		});
		const planner = new MarkdownChangePlanner({ read } satisfies MarkdownPlanningPort);
		const command = {
			type: 'bulk-update-relations', actor: 'author' as const, requestedAt: '2026-09-09T12:00:00+08:00', targetKeys: ['EVT-0001'],
			payload: { mutations: [
				{ path: 'new.md', operation: 'create' as const, content: 'new' },
				{ path: 'a.md', operation: 'modify' as const, content: '---\nstatus: occurred\n---\nnext-a' },
				{ path: 'b.md', operation: 'move' as const, targetPath: 'moved/b.md' },
				{ path: 'c.md', operation: 'delete' as const },
			], fieldDiffs: [{ path: 'a.md', field: 'status', before: 'planned', after: 'occurred' }] },
		};
		const first = await planner.plan(command, 'snapshot-1');
		const second = await planner.plan(command, 'snapshot-1');
		expect(first).toEqual(second);
		expect(first.files.map(file => file.path)).toEqual(['a.md', 'b.md', 'c.md', 'new.md']);
		expect(first.files.find(file => file.path === 'a.md')).toMatchObject({ expectedMtime: 1, recovery: 'restore_original' });
		expect(read).toHaveBeenCalled();
		expect(Object.keys({ read })).toEqual(['read']);
	});
});
