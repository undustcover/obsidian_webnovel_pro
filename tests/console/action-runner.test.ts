import { describe, expect, it, vi } from 'vitest';
import type { ChangePreview } from '../../src/console/application';
import type { TransactionResult } from '../../src/console/persistence';
import { ConsoleActionRunner, type ConsoleActionState } from '../../src/console/ui';

const preview = { plan: { planId: 'PLAN-1' }, impact: { planId: 'PLAN-1' } } as ChangePreview;
const succeeded = { status: 'succeeded', snapshotVersion: 'S2', audit: {} } as TransactionResult;

describe('ConsoleActionRunner', () => {
	it('runs plan, confirmation, execution, and visible success in order', async () => {
		const states: ConsoleActionState[] = [];
		const execute = vi.fn().mockResolvedValue(succeeded);
		const result = await new ConsoleActionRunner(state => states.push(state)).run('event:1', () => preview, async () => 'TOKEN', execute);
		expect(result.status).toBe('succeeded');
		expect(states.map(state => state.phase)).toEqual(['planning', 'awaiting_confirmation', 'executing', 'succeeded']);
		expect(execute).toHaveBeenCalledWith(preview, 'TOKEN');
	});

	it.each([
		['synchronous planning failure', () => { throw new Error('SYNC_FAIL'); }],
		['asynchronous planning rejection', async () => { throw new Error('ASYNC_FAIL'); }],
	] as const)('turns %s into a handled failed outcome', async (_label, plan) => {
		const states: ConsoleActionState[] = [];
		const result = await new ConsoleActionRunner(state => states.push(state)).run('event:2', plan, async () => 'TOKEN', vi.fn());
		expect(result).toMatchObject({ status: 'failed' });
		expect(states.at(-1)).toMatchObject({ phase: 'failed', message: '操作失败，未静默忽略。' });
	});

	it('cancels without executing and releases the action key', async () => {
		const execute = vi.fn(); const runner = new ConsoleActionRunner();
		expect((await runner.run('task:1', () => preview, async () => null, execute)).status).toBe('cancelled');
		expect(execute).not.toHaveBeenCalled();
		expect(runner.isBusy('task:1')).toBe(false);
	});

	it('rejects a duplicate click while the first action is awaiting confirmation', async () => {
		let release!: (token: string) => void;
		const confirmation = new Promise<string>(resolve => { release = resolve; });
		const runner = new ConsoleActionRunner();
		const first = runner.run('cursor:main', () => preview, () => confirmation, async () => succeeded);
		await Promise.resolve();
		expect(await runner.run('cursor:main', () => preview, async () => 'TOKEN', async () => succeeded)).toEqual({ status: 'duplicate' });
		release('TOKEN');
		expect((await first).status).toBe('succeeded');
	});

	it('surfaces conflicts and other non-success transaction results as failures', async () => {
		const states: ConsoleActionState[] = [];
		const conflict = { status: 'conflict', code: 'CONCURRENT_MODIFICATION', paths: ['a.md'] } as TransactionResult;
		const result = await new ConsoleActionRunner(state => states.push(state)).run('event:3', () => preview, async () => 'TOKEN', async () => conflict);
		expect(result).toMatchObject({ status: 'failed', error: { message: 'CONCURRENT_MODIFICATION' } });
		expect(states.at(-1)?.error).toBe('CONCURRENT_MODIFICATION');
	});
});
