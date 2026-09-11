import { createConsoleProjectFormDraft, validateConsoleProjectForm, type ConsoleProjectFormDraft, type ConsoleProjectFormErrors } from './projectForm';
import { normalizeConsoleProjects, type ConsoleConfigDiagnostic, type ConsoleProjectConfig } from './projectConfig';

export interface ConsoleProjectsSettingsValidation {
	projects: ConsoleProjectConfig[] | null;
	fieldErrors: ConsoleProjectFormErrors[];
	diagnostics: ConsoleConfigDiagnostic[];
}

export interface AdvancedJsonResult {
	applied: boolean;
	message?: string;
}

const cloneProjects = (projects: readonly ConsoleProjectConfig[]): ConsoleProjectConfig[] => structuredClone([...projects]);

export class ConsoleProjectsSettingsModel {
	drafts: ConsoleProjectFormDraft[];
	private committed: ConsoleProjectConfig[];

	constructor(projects: readonly ConsoleProjectConfig[]) {
		this.committed = cloneProjects(projects);
		this.drafts = this.committed.map(project => createConsoleProjectFormDraft(project));
	}

	addProject(): ConsoleProjectFormDraft {
		const ids = new Set(this.drafts.map(draft => draft.projectId));
		let index = this.drafts.length;
		while (ids.has(`project-${index + 1}`)) index += 1;
		const draft = createConsoleProjectFormDraft(undefined, index);
		this.drafts.push(draft);
		return draft;
	}

	removeProject(index: number): void {
		if (index >= 0 && index < this.drafts.length) this.drafts.splice(index, 1);
	}

	undo(): void {
		this.drafts = this.committed.map(project => createConsoleProjectFormDraft(project));
	}

	validate(): ConsoleProjectsSettingsValidation {
		const results = this.drafts.map(validateConsoleProjectForm);
		const fieldErrors = results.map(result => result.errors);
		if (results.some(result => !result.preview)) return { projects: null, fieldErrors, diagnostics: [] };
		const normalized = normalizeConsoleProjects(results.map(result => result.preview));
		if (normalized.diagnostics.some(item => item.severity === 'error')) return { projects: null, fieldErrors, diagnostics: normalized.diagnostics };
		return { projects: normalized.projects, fieldErrors, diagnostics: normalized.diagnostics };
	}

	toAdvancedJson(): string {
		return JSON.stringify(this.validate().projects ?? this.committed, null, 2);
	}

	applyAdvancedJson(value: string): AdvancedJsonResult {
		let parsed: unknown;
		try {
			parsed = value.trim() ? JSON.parse(value) : [];
		} catch {
			return { applied: false, message: 'JSON 格式无效。' };
		}
		if (!Array.isArray(parsed)) return { applied: false, message: '项目映射必须是 JSON 数组。' };
		const normalized = normalizeConsoleProjects(parsed);
		const error = normalized.diagnostics.find(item => item.severity === 'error');
		if (error) return { applied: false, message: error.message };
		this.drafts = normalized.projects.map(project => createConsoleProjectFormDraft(project));
		return { applied: true };
	}

	async save(persist: (projects: ConsoleProjectConfig[]) => Promise<void>): Promise<ConsoleProjectsSettingsValidation> {
		const validation = this.validate();
		if (!validation.projects) return validation;
		await persist(cloneProjects(validation.projects));
		this.committed = cloneProjects(validation.projects);
		this.drafts = this.committed.map(project => createConsoleProjectFormDraft(project));
		return validation;
	}
}

export async function persistConsoleProjects(
	settings: { consoleProjects: ConsoleProjectConfig[] },
	projects: ConsoleProjectConfig[],
	saveSettings: () => Promise<void>,
	reconfigure: (projects: ConsoleProjectConfig[]) => Promise<unknown> = async () => undefined,
): Promise<void> {
	const previous = settings.consoleProjects;
	settings.consoleProjects = cloneProjects(projects);
	let saved = false;
	try {
		await saveSettings();
		saved = true;
		await reconfigure(cloneProjects(projects));
	} catch (error) {
		settings.consoleProjects = previous;
		if (saved) {
			try { await saveSettings(); }
			catch (rollbackError) { throw new AggregateError([error, rollbackError], 'Console project reconfiguration and settings rollback both failed.'); }
		}
		throw error;
	}
}
