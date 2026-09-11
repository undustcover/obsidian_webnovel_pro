import { Setting } from 'obsidian';
import { t } from '../../i18n';
import type { ConsoleAvailabilityState, ConsoleRecoveryAction } from '../domain';

export interface IndexStatusPanelActions {
	onConfigure?: () => unknown;
	onRetry?: () => unknown;
	onRebuild?: () => unknown;
}

const titleKey = (status: ConsoleAvailabilityState['status']): string => `console.index-status.${status}`;

export function renderIndexStatusPanel(container: HTMLElement, state: ConsoleAvailabilityState, actions: IndexStatusPanelActions = {}): HTMLElement {
	const panel = container.createDiv({
		cls: `webnovel-console__index-status is-${state.status}`,
		attr: { role: state.status === 'error' ? 'alert' : 'status', 'aria-live': state.status === 'error' ? 'assertive' : 'polite', 'aria-atomic': 'true' },
	});
	new Setting(panel).setName(t(titleKey(state.status))).setHeading();
	panel.createDiv({ cls: 'webnovel-console__index-message', text: state.message });

	if (state.status === 'initializing') {
		panel.createEl('progress', {
			cls: 'webnovel-console__index-progress',
			attr: { max: String(Math.max(1, state.total)), value: String(Math.min(state.processed, Math.max(1, state.total))), 'aria-label': t('console.index-status.progress-label') },
		});
		panel.createDiv({ cls: 'webnovel-console__index-meta', text: t('console.index-status.progress', { processed: state.processed, total: state.total }) });
	}

	if (state.status === 'ready' || state.status === 'degraded') {
		panel.createDiv({ cls: 'webnovel-console__index-meta', text: t('console.index-status.records', { count: state.recordCount, version: state.snapshotVersion }) });
	}

	if (state.status === 'degraded' && state.failedPaths.length) {
		const failures = panel.createDiv({ cls: 'webnovel-console__index-failures' });
		failures.createDiv({ text: t('console.index-status.failed-files', { count: state.failedPaths.length }) });
		const list = failures.createEl('ul');
		for (const path of state.failedPaths) list.createEl('li', { text: path });
	}

	if (state.status === 'error' && state.technicalDetail) {
		const details = panel.createEl('details', { cls: 'webnovel-console__index-details' });
		details.createEl('summary', { text: t('console.index-status.technical-detail') });
		details.createEl('pre', { text: state.technicalDetail });
	}

	const actionHandlers: Partial<Record<ConsoleRecoveryAction, (() => unknown) | undefined>> = {
		configure: actions.onConfigure,
		retry: actions.onRetry,
		rebuild: actions.onRebuild,
	};
	const availableActions = state.suggestedActions.filter(action => action === 'configure' || state.retryable);
	if (availableActions.length) {
		const actionRow = panel.createDiv({ cls: 'webnovel-console__index-actions' });
		const feedback = panel.createDiv({ cls: 'webnovel-console__index-feedback', attr: { role: 'status', 'aria-live': 'polite' } });
		const buttons: HTMLButtonElement[] = [];
		for (const action of availableActions) {
			const handler = actionHandlers[action];
			if (!handler) continue;
			const button = actionRow.createEl('button', { text: t(`console.index-status.action.${action}`), attr: { type: 'button', 'aria-label': t(`console.index-status.action.${action}`) } });
			buttons.push(button);
			button.addEventListener('click', () => {
				for (const item of buttons) item.disabled = true;
				feedback.empty();
				feedback.createSpan({ text: t(`console.index-status.running.${action}`) });
				void Promise.resolve().then(handler).then(() => {
					if (!feedback.isConnected) return;
					feedback.empty();
					feedback.createSpan({ text: t('console.index-status.action-complete') });
					for (const item of buttons) item.disabled = false;
				}).catch(error => {
					if (!feedback.isConnected) return;
					feedback.addClass('is-error');
					feedback.empty();
					feedback.createSpan({ text: t('console.index-status.action-failed', { error: error instanceof Error ? error.message : String(error) }) });
					for (const item of buttons) item.disabled = false;
				});
			});
		}
	}

	return panel;
}
