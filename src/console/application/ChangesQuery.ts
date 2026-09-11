import type { AuditRecord } from '../domain';
import type { AuditRepository } from '../persistence';

export interface ChangeHistoryEntry extends AuditRecord {
	recoveryAvailable: boolean;
}

export class ChangesQuery {
	constructor(private readonly repository?: AuditRepository) {}

	async execute(): Promise<ChangeHistoryEntry[]> {
		const records = await this.repository?.list() || [];
		return records
			.map(record => ({ ...record, recoveryAvailable: record.result === 'manual_recovery_required' || record.result === 'compensated' }))
			.sort((left, right) => right.startedAt.localeCompare(left.startedAt) || right.auditId.localeCompare(left.auditId));
	}
}
