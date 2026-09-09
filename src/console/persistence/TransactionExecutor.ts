import type { AuditRecord, ChangePlan, FileChange, ManualRecoveryItem } from '../domain';
import { AUDIT_SCHEMA_VERSION } from '../domain';
import { contentHash } from '../application';

export interface TransactionFileState { mtime: number; content: string }
export interface TransactionPort {
	read(path: string): Promise<TransactionFileState | null>;
	create(path: string, content: string): Promise<void>;
	modify(path: string, content: string): Promise<void>;
	delete(path: string): Promise<void>;
	move(path: string, targetPath: string): Promise<void>;
}
export interface IndexRefreshPort {
	waitForRefresh(paths: readonly string[], snapshotBefore: string): Promise<string>;
}
export interface AuditSink { append(record: AuditRecord): Promise<void> }

export type TransactionResult =
	| { status: 'succeeded'; snapshotVersion: string; audit: AuditRecord }
	| { status: 'conflict'; code: 'CONCURRENT_MODIFICATION'; paths: string[] }
	| { status: 'failed'; code: string; compensated: true; audit: AuditRecord }
	| { status: 'manual_recovery_required'; code: string; recovery: ManualRecoveryItem[]; audit: AuditRecord };

export class ConfirmationTokenService {
	private readonly tokens = new Map<string, string>();
	private sequence = 0;

	issue(planId: string): string {
		const entropy = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
			? crypto.randomUUID()
			: `${Date.now()}-${++this.sequence}`;
		const token = `${planId}.${contentHash(entropy)}`;
		this.tokens.set(token, planId);
		return token;
	}

	consume(planId: string, token?: string): boolean {
		if (!token || this.tokens.get(token) !== planId) return false;
		this.tokens.delete(token);
		return true;
	}
}

interface AppliedChange { change: FileChange; original: TransactionFileState | null }

export class TransactionExecutor {
	private queue: Promise<void> = Promise.resolve();
	private readonly executedPlans = new Set<string>();
	private accepting = true;

	constructor(
		private readonly files: TransactionPort,
		private readonly index: IndexRefreshPort,
		private readonly tokens: ConfirmationTokenService,
		private readonly audit?: AuditSink,
	) {}

	execute(plan: ChangePlan, confirmationToken?: string): Promise<TransactionResult> {
		if (!this.accepting) return Promise.reject(new Error('Console transaction executor is shutting down'));
		let resolveResult!: (result: TransactionResult) => void;
		let rejectResult!: (reason?: unknown) => void;
		const result = new Promise<TransactionResult>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
		this.queue = this.queue.then(async () => {
			try { resolveResult(await this.executeSerial(plan, confirmationToken)); }
			catch (error) { rejectResult(error); }
		}, rejectResult);
		return result;
	}

	async settled(): Promise<void> { await this.queue; }
	async destroy(): Promise<void> { this.accepting = false; await this.settled(); }

	private async executeSerial(plan: ChangePlan, confirmationToken?: string): Promise<TransactionResult> {
		if (this.executedPlans.has(plan.planId)) throw new Error(`Plan already executed: ${plan.planId}`);
		if (plan.requiresConfirmation && !this.tokens.consume(plan.planId, confirmationToken)) throw new Error('A valid one-time confirmation token is required');
		const ordered = [...plan.files].sort((left, right) => left.path.localeCompare(right.path));
		const originals = new Map<string, TransactionFileState | null>();
		const conflicts: string[] = [];
		for (const change of ordered) {
			const current = await this.files.read(change.path);
			originals.set(change.path, current);
			if (change.operation === 'create') {
				if (current) conflicts.push(change.path);
			} else if (!current || current.mtime !== change.expectedMtime || contentHash(current.content) !== change.expectedContentHash) {
				conflicts.push(change.path);
			}
			if (change.targetPath && await this.files.read(change.targetPath)) conflicts.push(change.targetPath);
		}
		if (conflicts.length) return { status: 'conflict', code: 'CONCURRENT_MODIFICATION', paths: [...new Set(conflicts)].sort() };

		const startedAt = new Date().toISOString();
		const affectedPaths = ordered.flatMap(change => [change.path, ...(change.targetPath ? [change.targetPath] : [])]);
		let snapshotCheckpoint = plan.snapshotVersion;
		const applied: AppliedChange[] = [];
		try {
			for (const change of ordered) {
				await this.apply(change);
				applied.push({ change, original: originals.get(change.path) || null });
			}
			const snapshotAfter = await this.index.waitForRefresh(affectedPaths, plan.snapshotVersion);
			snapshotCheckpoint = snapshotAfter;
			this.executedPlans.add(plan.planId);
			const audit = this.makeAudit(plan, startedAt, 'succeeded', snapshotAfter);
			await this.audit?.append(audit);
			return { status: 'succeeded', snapshotVersion: snapshotAfter, audit };
		} catch (error) {
			const code = error instanceof Error ? error.message : String(error);
			const recovery = await this.compensate(applied);
			const result = recovery.length ? 'manual_recovery_required' : 'compensated';
			let compensationResult = recovery.length ? 'manual recovery required' : 'restored';
			if (!recovery.length && applied.length) {
				try { snapshotCheckpoint = await this.index.waitForRefresh(affectedPaths, snapshotCheckpoint); }
				catch { compensationResult += '; index refresh after compensation failed'; }
			}
			const audit = this.makeAudit(plan, startedAt, result, snapshotCheckpoint, code, compensationResult);
			try { await this.audit?.append(audit); } catch { /* Do not hide the exact recovery result behind a secondary audit failure. */ }
			if (recovery.length) return { status: 'manual_recovery_required', code, recovery, audit };
			return { status: 'failed', code, compensated: true, audit };
		}
	}

	private async apply(change: FileChange): Promise<void> {
		if (change.operation === 'create') return this.files.create(change.path, change.content || '');
		if (change.operation === 'modify') return this.files.modify(change.path, change.content || '');
		if (change.operation === 'delete') return this.files.delete(change.path);
		return this.files.move(change.path, change.targetPath!);
	}

	private async compensate(applied: AppliedChange[]): Promise<ManualRecoveryItem[]> {
		const recovery: ManualRecoveryItem[] = [];
		for (const entry of [...applied].reverse()) {
			const { change, original } = entry;
			try {
				if (change.operation === 'create') {
					const current = await this.files.read(change.path);
					if (!current || contentHash(current.content) !== contentHash(change.content || '')) throw new Error('created file changed externally');
					await this.files.delete(change.path);
				} else if (change.operation === 'modify') {
					const current = await this.files.read(change.path);
					if (!current || contentHash(current.content) !== contentHash(change.content || '')) throw new Error('modified file changed externally');
					await this.files.modify(change.path, original!.content);
				} else if (change.operation === 'delete') {
					if (await this.files.read(change.path)) throw new Error('deleted path was recreated externally');
					await this.files.create(change.path, original!.content);
				} else {
					const target = await this.files.read(change.targetPath!);
					if (await this.files.read(change.path) || !target || contentHash(target.content) !== contentHash(original!.content)) throw new Error('moved file changed externally');
					await this.files.move(change.targetPath!, change.path);
				}
			} catch (error) {
				recovery.push({
					path: change.path, operation: change.operation,
					reason: error instanceof Error ? error.message : String(error),
					recommendedAction: `Restore ${change.path} from the in-memory transaction recovery report before running more Console writes.`,
					originalContent: original?.content,
				});
				break;
			}
		}
		return recovery;
	}

	private makeAudit(plan: ChangePlan, startedAt: string, result: AuditRecord['result'], snapshotAfter?: string, errorCode?: string, compensationResult?: string): AuditRecord {
		return {
			schemaVersion: AUDIT_SCHEMA_VERSION,
			auditId: `AUDIT-${plan.planId}-${contentHash(startedAt).slice(-8)}`,
			planId: plan.planId, commandType: plan.command.type, actor: plan.command.actor,
			startedAt, completedAt: new Date().toISOString(), targetKeys: [...plan.command.targetKeys],
			paths: plan.files.flatMap(change => [change.path, ...(change.targetPath ? [change.targetPath] : [])]),
			fieldDiffs: plan.fieldDiffs.map(diff => ({ ...diff })), result, errorCode, compensationResult,
			snapshotBefore: plan.snapshotVersion, snapshotAfter,
		};
	}
}
