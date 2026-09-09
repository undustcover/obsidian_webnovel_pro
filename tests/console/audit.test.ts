import { describe, expect, it } from 'vitest';
import { AUDIT_SCHEMA_VERSION, type AuditRecord } from '../../src/console/domain';
import { AuditRepository } from '../../src/console/persistence';

describe('AuditRepository', () => {
	it('persists queryable lightweight records without body fields', async () => {
		let stored: string | null = null;
		const repository = new AuditRepository({ read: async () => stored, write: async value => { stored = value; } });
		const record = {
			schemaVersion: AUDIT_SCHEMA_VERSION, auditId: 'AUDIT-1', planId: 'PLAN-1', commandType: 'modify', actor: 'author',
			startedAt: '2026-09-09T00:00:00+08:00', completedAt: '2026-09-09T00:00:01+08:00', targetKeys: ['EVT-0001'],
			paths: ['event.md'], fieldDiffs: [], result: 'succeeded', snapshotBefore: 's1', snapshotAfter: 's2',
			content: 'must never persist',
		} as AuditRecord & { content: string };
		await repository.append(record);
		expect(stored).not.toContain('must never persist');
		expect(await repository.findByPlanId('PLAN-1')).toHaveLength(1);
	});
});
