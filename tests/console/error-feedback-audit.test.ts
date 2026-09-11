import { describe, expect, it, vi } from 'vitest';
import { auditConsoleErrorFeedback, auditConsoleUiDirectory } from '../../scripts/console-error-feedback-audit';
import type { ChangePreview } from '../../src/console/application';
import { CHANGE_PLAN_SCHEMA_VERSION, IMPACT_REPORT_SCHEMA_VERSION } from '../../src/console/domain';
import { ConsoleActionRunner, type ConsoleActionState } from '../../src/console/ui';

describe('P0-090C Console error feedback audit', () => {
	it('rejects known unhandled, empty-catch, and log-only bad samples', () => {
		expect(auditConsoleErrorFeedback("button.addEventListener('click', () => { void save().then(done); });").map(issue => issue.code)).toContain('UNHANDLED_PROMISE');
		expect(auditConsoleErrorFeedback('async function save() { try { await write(); } catch {} }').map(issue => issue.code)).toContain('EMPTY_CATCH');
		expect(auditConsoleErrorFeedback("void save().catch(error => console.error(error));").map(issue => issue.code)).toContain('ERROR_WITHOUT_RECOVERY');
	});

	it('finds no unhandled Console UI promise or feedback-free catch path', () => {
		expect(auditConsoleUiDirectory()).toEqual([]);
	});

	it.each(['planning', 'confirmation', 'execution'] as const)('surfaces %s failure and releases busy state', async phase => {
		const states: ConsoleActionState[] = [];
		const runner = new ConsoleActionRunner(state => states.push(state));
		const preview = {
			plan: { schemaVersion: CHANGE_PLAN_SCHEMA_VERSION, planId: 'P1', command: { type: 'update-entity-fields', actor: 'author', requestedAt: '', targetKeys: ['X'] }, snapshotVersion: 'S1', risk: 'medium', requiresConfirmation: true, files: [], fieldDiffs: [], relationDiffs: [], warnings: [] },
			impact: { schemaVersion: IMPACT_REPORT_SCHEMA_VERSION, planId: 'P1', incomingLinks: [], outgoingLinks: [], events: [], tasks: [], foreshadowing: [], characters: [], items: [], knowledgeStates: [], chapters: [], contexts: [], healthItems: [], newNowActions: [], newMissedActions: [], importantChangeSuggested: false, unknownRisks: [] },
		} as ChangePreview;
		const plan = phase === 'planning' ? vi.fn().mockRejectedValue(new Error('PLAN_FAILED')) : vi.fn().mockResolvedValue(preview);
		const confirm = phase === 'confirmation' ? vi.fn().mockRejectedValue(new Error('CONFIRM_FAILED')) : vi.fn().mockResolvedValue('TOKEN');
		const execute = phase === 'execution' ? vi.fn().mockRejectedValue(new Error('EXECUTE_FAILED')) : vi.fn().mockResolvedValue({ status: 'succeeded', snapshotVersion: 'S2', audit: {} });
		const result = await runner.run(`failure:${phase}`, plan, confirm, execute);
		expect(result.status).toBe('failed');
		expect(states.at(-1)).toMatchObject({ phase: 'failed', message: '操作失败，未静默忽略。' });
		expect(runner.isBusy(`failure:${phase}`)).toBe(false);
	});

	it('keeps cancellation visible and guarantees zero execute calls', async () => {
		const states: ConsoleActionState[] = [];
		const runner = new ConsoleActionRunner(state => states.push(state));
		const execute = vi.fn();
		const result = await runner.run('cancel', () => ({ plan: {}, impact: {} }) as ChangePreview, async () => null, execute);
		expect(result.status).toBe('cancelled');
		expect(states.at(-1)).toMatchObject({ phase: 'cancelled', message: '已取消，未写入任何文件。' });
		expect(execute).not.toHaveBeenCalled();
	});
});
