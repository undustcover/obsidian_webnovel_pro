import { describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ buttons: [] as Array<{ disabled: boolean; click: () => void }>, texts: [] as string[] }));

vi.mock('obsidian', () => {
	class El {
		disabled = false;
		listeners = new Map<string, (event?: unknown) => void>();
		empty() {}
		addClass() {}
		removeClass() {}
		setAttribute() {}
		addEventListener(name: string, callback: (event?: unknown) => void) { this.listeners.set(name, callback); }
		removeEventListener(name: string) { this.listeners.delete(name); }
		setText(value: string) { harness.texts.push(value); }
		createDiv() { return new El(); }
		createEl(tag: string) {
			const child = new El();
			if (tag === 'button') harness.buttons.push({ get disabled() { return child.disabled; }, set disabled(value) { child.disabled = value; }, click: () => child.listeners.get('click')?.() });
			return child;
		}
	}
	class Modal {
		modalEl = new El(); contentEl = new El();
		constructor(public app: unknown) {}
		close() { (this as unknown as { onClose?: () => void }).onClose?.(); }
	}
	class Setting { constructor(_el: unknown) {} setName() { return this; } setHeading() { return this; } }
	return { Modal, Setting };
});

import { CHANGE_PLAN_SCHEMA_VERSION, IMPACT_REPORT_SCHEMA_VERSION } from '../../src/console/domain';
import { ChangePreviewModal } from '../../src/console/ui/ChangePreviewModal';

describe('ChangePreviewModal', () => {
	const options = (onConfirm: () => void | Promise<void>, issueToken = vi.fn().mockReturnValue('token')) => ({
		plan: { schemaVersion: CHANGE_PLAN_SCHEMA_VERSION, planId: 'P1', command: { type: 'x', actor: 'author' as const, requestedAt: '', targetKeys: [] }, snapshotVersion: 's1', risk: 'high' as const, requiresConfirmation: true, files: [], fieldDiffs: [], relationDiffs: [], warnings: [] },
		impact: { schemaVersion: IMPACT_REPORT_SCHEMA_VERSION, planId: 'P1', incomingLinks: [], outgoingLinks: [], events: [], tasks: [], foreshadowing: [], characters: [], items: [], knowledgeStates: [], chapters: [], contexts: [], healthItems: [], newNowActions: [], newMissedActions: [], importantChangeSuggested: false, unknownRisks: [] },
		issueToken, onConfirm,
	});

	it('issues a token only on explicit confirmation and prevents a second submit', async () => {
		harness.buttons.length = 0;
		const issueToken = vi.fn().mockReturnValue('token');
		const onConfirm = vi.fn();
		const modal = new ChangePreviewModal({} as never, options(onConfirm, issueToken));
		modal.onOpen();
		const confirm = harness.buttons.at(-1)!;
		confirm.click();
		confirm.click();
		await Promise.resolve();
		expect(issueToken).toHaveBeenCalledOnce();
		expect(onConfirm).toHaveBeenCalledOnce();
		expect(confirm.disabled).toBe(true);
	});

	it('shows execution failure, re-enables confirmation, and allows retry', async () => {
		harness.buttons.length = 0;
		harness.texts.length = 0;
		const modal = new ChangePreviewModal({} as never, options(vi.fn().mockRejectedValue(new Error('write failed'))));
		modal.onOpen();
		const confirm = harness.buttons.at(-1)!;
		confirm.click();
		await Promise.resolve();
		await Promise.resolve();
		expect(confirm.disabled).toBe(false);
		expect(harness.texts).toContain('执行失败，可重试：write failed');
	});
});
