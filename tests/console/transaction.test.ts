import { describe, expect, it, vi } from 'vitest';
import { CHANGE_PLAN_SCHEMA_VERSION, type ChangePlan } from '../../src/console/domain';
import { contentHash } from '../../src/console/application';
import { ConfirmationTokenService, TransactionExecutor, type TransactionPort } from '../../src/console/persistence';

class MemoryPort implements TransactionPort {
	files = new Map<string, { mtime: number; content: string }>();
	writes: string[] = [];
	failOn?: string;
	externalChangeOnFailure?: () => void;
	async read(path: string) { const value = this.files.get(path); return value ? { ...value } : null; }
	async create(path: string, content: string) { this.maybeFail(`create:${path}`); this.files.set(path, { mtime: Date.now(), content }); this.writes.push(`create:${path}`); }
	async modify(path: string, content: string) { this.maybeFail(`modify:${path}`); this.files.set(path, { mtime: Date.now(), content }); this.writes.push(`modify:${path}`); }
	async delete(path: string) { this.maybeFail(`delete:${path}`); this.files.delete(path); this.writes.push(`delete:${path}`); }
	async move(path: string, target: string) { this.maybeFail(`move:${path}`); this.files.set(target, this.files.get(path)!); this.files.delete(path); this.writes.push(`move:${path}`); }
	private maybeFail(operation: string) { if (this.failOn === operation) { this.externalChangeOnFailure?.(); throw new Error(`injected:${operation}`); } }
}

function plan(files: ChangePlan['files']): ChangePlan {
	return {
		schemaVersion: CHANGE_PLAN_SCHEMA_VERSION, planId: 'PLAN-1', snapshotVersion: 'snap-1', risk: 'high', requiresConfirmation: true,
		command: { type: 'advance-event', actor: 'author', requestedAt: '2026-09-09T12:00:00+08:00', targetKeys: ['EVT-0001'] },
		files, fieldDiffs: [], relationDiffs: [], warnings: [],
	};
}

describe('TransactionExecutor', () => {
	it('requires a one-time plan-bound token and writes in stable path order', async () => {
		const port = new MemoryPort();
		const tokens = new ConfirmationTokenService();
		const executor = new TransactionExecutor(port, { waitForRefresh: vi.fn().mockResolvedValue('snap-2') }, tokens);
		const change = plan([
			{ path: 'z.md', operation: 'create', content: 'z', recovery: 'delete_created' },
			{ path: 'a.md', operation: 'create', content: 'a', recovery: 'delete_created' },
		]);
		await expect(executor.execute(change)).rejects.toThrow('confirmation token');
		const result = await executor.execute(change, tokens.issue(change.planId));
		expect(result.status).toBe('succeeded');
		expect(port.writes).toEqual(['create:a.md', 'create:z.md']);
		await expect(executor.execute(change, tokens.issue(change.planId))).rejects.toThrow('already executed');
	});

	it('aborts on optimistic concurrency conflict with zero writes', async () => {
		const port = new MemoryPort();
		port.files.set('a.md', { mtime: 2, content: 'external' });
		const tokens = new ConfirmationTokenService();
		const executor = new TransactionExecutor(port, { waitForRefresh: vi.fn() }, tokens);
		const change = plan([{ path: 'a.md', operation: 'modify', content: 'next', expectedMtime: 1, expectedContentHash: contentHash('old'), recovery: 'restore_original' }]);
		const result = await executor.execute(change, tokens.issue(change.planId));
		expect(result).toMatchObject({ status: 'conflict', paths: ['a.md'] });
		expect(port.writes).toEqual([]);
	});

	it('compensates applied files in reverse order after an injected failure', async () => {
		const port = new MemoryPort();
		port.files.set('a.md', { mtime: 1, content: 'old' });
		port.failOn = 'create:b.md';
		const tokens = new ConfirmationTokenService();
		const executor = new TransactionExecutor(port, { waitForRefresh: vi.fn() }, tokens);
		const change = plan([
			{ path: 'a.md', operation: 'modify', content: 'next', expectedMtime: 1, expectedContentHash: contentHash('old'), recovery: 'restore_original' },
			{ path: 'b.md', operation: 'create', content: 'new', recovery: 'delete_created' },
		]);
		const result = await executor.execute(change, tokens.issue(change.planId));
		expect(result.status).toBe('failed');
		expect(port.files.get('a.md')?.content).toBe('old');
	});

	it('stops compensation instead of overwriting an external change', async () => {
		const port = new MemoryPort();
		port.files.set('a.md', { mtime: 1, content: 'old' });
		port.failOn = 'create:b.md';
		port.externalChangeOnFailure = () => port.files.set('a.md', { mtime: 9, content: 'author edit' });
		const tokens = new ConfirmationTokenService();
		const executor = new TransactionExecutor(port, { waitForRefresh: vi.fn() }, tokens);
		const change = plan([
			{ path: 'a.md', operation: 'modify', content: 'next', expectedMtime: 1, expectedContentHash: contentHash('old'), recovery: 'restore_original' },
			{ path: 'b.md', operation: 'create', content: 'new', recovery: 'delete_created' },
		]);
		const result = await executor.execute(change, tokens.issue(change.planId));
		expect(result.status).toBe('manual_recovery_required');
		expect(port.files.get('a.md')?.content).toBe('author edit');
	});

	it('restores deleted and moved files when index publication fails', async () => {
		const port = new MemoryPort();
		port.files.set('delete.md', { mtime: 1, content: 'deleted body' });
		port.files.set('move.md', { mtime: 2, content: 'moved body' });
		const tokens = new ConfirmationTokenService();
		const executor = new TransactionExecutor(port, { waitForRefresh: vi.fn().mockRejectedValue(new Error('index failed')) }, tokens);
		const change = plan([
			{ path: 'delete.md', operation: 'delete', expectedMtime: 1, expectedContentHash: contentHash('deleted body'), recovery: 'restore_original' },
			{ path: 'move.md', operation: 'move', targetPath: 'target.md', expectedMtime: 2, expectedContentHash: contentHash('moved body'), recovery: 'move_back' },
		]);
		const result = await executor.execute(change, tokens.issue(change.planId));
		await executor.settled();
		expect(result.status).toBe('failed');
		expect(port.files.get('delete.md')?.content).toBe('deleted body');
		expect(port.files.get('move.md')?.content).toBe('moved body');
		expect(port.files.has('target.md')).toBe(false);
		await executor.destroy();
		await expect(executor.execute(change, tokens.issue(change.planId))).rejects.toThrow('shutting down');
	});
});
