import { Setting } from 'obsidian';
import { CONSOLE_DIRECTORY_KEYS, createConsoleProjectFormDraft, persistConsoleProjects, validateConsoleProjectForm, type ConsoleProjectConfig, type ConsoleProjectFormDraft, type ConsoleProjectFormErrors } from '../config';

export interface ConsoleOnboardingOptions {
	folderCandidates: string[];
	initialDraft?: ConsoleProjectFormDraft;
	onSave(project: ConsoleProjectConfig): Promise<void>;
	onCancel(): void;
}

export type ConsoleOnboardingStatus = 'idle' | 'saving' | 'saved' | 'error' | 'cancelled';

export async function persistOnboardingProject(
	settings: { consoleProjects: ConsoleProjectConfig[] },
	project: ConsoleProjectConfig,
	saveSettings: () => Promise<void>,
	reconfigure: (projects: ConsoleProjectConfig[]) => Promise<unknown> = async () => undefined,
): Promise<void> {
	await persistConsoleProjects(settings, [...settings.consoleProjects, project], saveSettings, reconfigure);
}

export class ConsoleOnboardingSession {
	readonly draft: ConsoleProjectFormDraft;
	errors: ConsoleProjectFormErrors = {};
	status: ConsoleOnboardingStatus = 'idle';
	message = '';

	constructor(private readonly options: ConsoleOnboardingOptions, private readonly onChange: () => void = () => undefined) {
		this.draft = options.initialDraft ?? createConsoleProjectFormDraft();
	}

	async submit(): Promise<boolean> {
		if (this.status === 'saving') return false;
		const result = validateConsoleProjectForm(this.draft);
		this.errors = result.errors;
		if (!result.preview) {
			this.status = 'error';
			this.message = '请修正标出的配置字段。';
			this.onChange();
			return false;
		}
		this.status = 'saving';
		this.message = '正在保存项目配置…';
		this.onChange();
		try {
			await this.options.onSave(result.preview);
			this.status = 'saved';
			this.message = '项目配置已保存。';
			this.onChange();
			return true;
		} catch (error) {
			this.status = 'error';
			this.message = error instanceof Error ? `保存失败：${error.message}` : '保存失败，请重试。';
			this.onChange();
			return false;
		}
	}

	cancel(): void {
		if (this.status === 'saving') return;
		this.status = 'cancelled';
		this.message = '已取消，未保存任何配置。';
		this.options.onCancel();
		this.onChange();
	}
}

let candidateListId = 0;

export function renderOnboardingPage(container: HTMLElement, options: ConsoleOnboardingOptions): ConsoleOnboardingSession {
	let session: ConsoleOnboardingSession;
	const render = () => {
		container.empty();
		const page = container.createDiv({ cls: 'webnovel-console__onboarding' });
		new Setting(page).setName('首次配置小说项目').setHeading();
		page.createEl('p', { text: '选择 Vault 中的作品根目录并确认目录别名。此步骤只保存插件设置，不会创建或修改 Markdown。' });
		const form = page.createEl('form');
		const listId = `webnovel-console-folders-${candidateListId}`;

		const textField = (labelText: string, field: keyof Pick<ConsoleProjectFormDraft, 'projectId' | 'projectCode' | 'root'>, list?: string) => {
			const row = form.createDiv({ cls: 'webnovel-console__form-field' });
			row.createEl('label', { text: labelText, attr: { for: `webnovel-console-${field}` } });
			const input = row.createEl('input', { type: 'text', value: session.draft[field], attr: { id: `webnovel-console-${field}`, ...(list ? { list } : {}), 'aria-invalid': session.errors[field] ? 'true' : 'false' } });
			input.addEventListener('input', () => { session.draft[field] = input.value; });
			if (session.errors[field]) row.createDiv({ cls: 'webnovel-console__form-error', text: session.errors[field] });
		};

		textField('项目 ID', 'projectId');
		textField('项目代码', 'projectCode');
		textField('作品根目录', 'root', listId);
		const datalist = form.createEl('datalist', { attr: { id: listId } });
		for (const path of [...new Set(options.folderCandidates)].sort((a, b) => a.localeCompare(b))) datalist.createEl('option', { value: path });

		const directoryGroup = form.createEl('fieldset');
		directoryGroup.createEl('legend', { text: '目录预览与别名' });
		for (const key of CONSOLE_DIRECTORY_KEYS) {
			const field = `directories.${key}` as const;
			const row = directoryGroup.createDiv({ cls: 'webnovel-console__form-field' });
			row.createEl('label', { text: key, attr: { for: `webnovel-console-directory-${key}` } });
			const input = row.createEl('input', { type: 'text', value: session.draft.directories[key], attr: { id: `webnovel-console-directory-${key}`, 'aria-invalid': session.errors[field] ? 'true' : 'false' } });
			input.addEventListener('input', () => { session.draft.directories[key] = input.value; });
			if (session.errors[field]) row.createDiv({ cls: 'webnovel-console__form-error', text: session.errors[field] });
		}

		const status = page.createDiv({ cls: `webnovel-console__form-status is-${session.status}`, text: session.message, attr: { role: 'status', 'aria-live': 'polite' } });
		status.toggleAttribute('hidden', !session.message);
		const actions = form.createDiv({ cls: 'webnovel-console__actions' });
		const save = actions.createEl('button', { text: session.status === 'saving' ? '保存中…' : '保存配置', attr: { type: 'submit' } });
		save.disabled = session.status === 'saving' || session.status === 'saved';
		const cancel = actions.createEl('button', { text: '取消', attr: { type: 'button' } });
		cancel.disabled = session.status === 'saving';
		form.addEventListener('submit', event => { event.preventDefault(); void session.submit(); });
		cancel.addEventListener('click', () => session.cancel());
	};
	candidateListId += 1;
	session = new ConsoleOnboardingSession(options, render);
	render();
	return session;
}
