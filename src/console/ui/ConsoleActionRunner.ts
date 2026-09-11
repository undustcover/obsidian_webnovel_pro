import type { ChangePreview } from '../application';
import type { TransactionResult } from '../persistence';

export type ConsoleActionPhase = 'idle' | 'planning' | 'awaiting_confirmation' | 'executing' | 'succeeded' | 'cancelled' | 'failed';
export interface ConsoleActionState { key: string; phase: ConsoleActionPhase; message?: string; error?: string }
export type ConsoleActionOutcome =
	| { status: 'succeeded'; result: TransactionResult }
	| { status: 'cancelled' | 'duplicate' }
	| { status: 'failed'; error: Error };

export class ConsoleActionRunner {
	private active = new Set<string>();
	constructor(private readonly onState: (state: ConsoleActionState) => void = () => undefined) {}

	isBusy(key: string): boolean { return this.active.has(key); }

	async run(
		key: string,
		plan: () => ChangePreview | Promise<ChangePreview>,
		confirm: (preview: ChangePreview) => Promise<string | null>,
		execute: (preview: ChangePreview, token: string) => Promise<TransactionResult>,
	): Promise<ConsoleActionOutcome> {
		if (this.active.has(key)) return { status: 'duplicate' };
		this.active.add(key);
		try {
			this.onState({ key, phase: 'planning', message: '正在生成变更预览…' });
			const preview = await Promise.resolve().then(plan);
			this.onState({ key, phase: 'awaiting_confirmation', message: '等待作者确认。' });
			const token = await confirm(preview);
			if (!token) { this.onState({ key, phase: 'cancelled', message: '已取消，未写入任何文件。' }); return { status: 'cancelled' }; }
			this.onState({ key, phase: 'executing', message: '正在执行并等待索引刷新…' });
			const result = await execute(preview, token);
			if (result.status !== 'succeeded') throw new Error(result.code);
			this.onState({ key, phase: 'succeeded', message: `操作成功，索引已刷新至 ${result.snapshotVersion}。` });
			return { status: 'succeeded', result };
		} catch (cause) {
			const error = cause instanceof Error ? cause : new Error(String(cause));
			this.onState({ key, phase: 'failed', message: '操作失败，未静默忽略。', error: error.message });
			return { status: 'failed', error };
		} finally {
			this.active.delete(key);
		}
	}
}
