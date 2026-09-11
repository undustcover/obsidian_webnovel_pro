import { Modal, Setting, type App } from 'obsidian';
import type { ChangePlan, ImpactReport } from '../domain';

export interface ChangePreviewModalOptions {
	plan: ChangePlan;
	impact: ImpactReport;
	issueToken: () => string;
	onConfirm: (plan: ChangePlan, token: string) => void | Promise<void>;
	onCancel?: () => void;
}

const impactSections: readonly [keyof ImpactReport, string][] = [
	['incomingLinks', '入链'], ['outgoingLinks', '出链'], ['events', '事件'], ['tasks', '任务'],
	['foreshadowing', '伏笔'], ['characters', '人物'], ['items', '物品'], ['knowledgeStates', '知识状态'],
	['chapters', '章节'], ['contexts', '上下文'], ['healthItems', '健康项'], ['newNowActions', '新增立即行动'],
	['newMissedActions', '新增已错过行动'], ['unknownRisks', '不可判断风险'],
];

export class ChangePreviewModal extends Modal {
	private submitted = false;
	private readonly onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') this.close();
	};

	constructor(app: App, private readonly options: ChangePreviewModalOptions) { super(app); }

	onOpen(): void {
		this.modalEl.addClass('webnovel-console-modal');
		this.modalEl.setAttribute('role', 'dialog');
		this.modalEl.setAttribute('aria-modal', 'true');
		this.modalEl.addEventListener('keydown', this.onKeyDown);
		this.contentEl.empty();
		new Setting(this.contentEl).setName('确认变更预览').setHeading();
		this.contentEl.createDiv({ cls: `webnovel-console-modal__risk is-${this.options.plan.risk}`, text: `风险级别：${this.options.plan.risk}` });

		this.renderList('文件变更', this.options.plan.files.map(file => `${file.operation}: ${file.path}${file.targetPath ? ` → ${file.targetPath}` : ''}`));
		this.renderList('字段差异', this.options.plan.fieldDiffs.map(diff => `${diff.path} · ${diff.field}: ${String(diff.before)} → ${String(diff.after)}`));
		this.renderList('关系差异', this.options.plan.relationDiffs.map(diff => `${diff.operation}: ${diff.fromKey} → ${diff.toRef}`));
		for (const [key, label] of impactSections) {
			const value = this.options.impact[key];
			if (Array.isArray(value)) this.renderList(label, value.map(item => typeof item === 'string' ? item : JSON.stringify(item)));
		}
		this.renderList('警告', this.options.plan.warnings);

		const actions = this.contentEl.createDiv({ cls: 'webnovel-console-modal__actions' });
		const feedback = this.contentEl.createDiv({ cls: 'webnovel-console-modal__feedback', attr: { role: 'alert', 'aria-live': 'assertive' } });
		const cancel = actions.createEl('button', { text: '取消', attr: { type: 'button' } });
		cancel.addEventListener('click', () => this.close());
		const confirm = actions.createEl('button', { cls: 'mod-cta', text: '确认并执行', attr: { type: 'button' } });
		confirm.addEventListener('click', () => {
			if (this.submitted) return;
			this.submitted = true;
			confirm.disabled = true;
			const token = this.options.issueToken();
			void Promise.resolve(this.options.onConfirm(this.options.plan, token)).then(() => this.close()).catch(error => {
				this.submitted = false;
				confirm.disabled = false;
				feedback.setText(`执行失败，可重试：${error instanceof Error ? error.message : String(error)}`);
			});
		});
	}

	onClose(): void {
		this.modalEl.removeEventListener('keydown', this.onKeyDown);
		this.modalEl.removeClass('webnovel-console-modal');
		this.contentEl.empty();
		if (!this.submitted) this.options.onCancel?.();
	}

	private renderList(title: string, items: readonly string[]): void {
		const section = this.contentEl.createDiv({ cls: 'webnovel-console-modal__section' });
		new Setting(section).setName(title).setHeading();
		if (items.length === 0) { section.createDiv({ cls: 'webnovel-console-modal__empty', text: '无' }); return; }
		const list = section.createEl('ul');
		for (const item of items) list.createEl('li', { text: item });
	}
}
