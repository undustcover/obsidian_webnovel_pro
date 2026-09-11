import {
	CONSOLE_DIRECTORY_KEYS,
	createDefaultConsoleProject,
	type ConsoleDirectories,
	type ConsoleDirectoryKey,
	type ConsoleProjectConfig,
} from './projectConfig';

export type ConsoleProjectFormField =
	| 'projectId'
	| 'projectCode'
	| 'root'
	| `directories.${ConsoleDirectoryKey}`
	| 'activationDistance'
	| 'contextDepth'
	| 'eventPrerequisiteDepth'
	| 'performance.initialIndexMaxMs'
	| 'performance.batchSize'
	| 'performance.incrementalP95MaxMs'
	| 'performance.searchP95MaxMs';

export type ConsoleProjectFormErrors = Partial<Record<ConsoleProjectFormField, string>>;

export interface ConsoleProjectFormDraft {
	projectId: string;
	projectCode: string;
	root: string;
	directories: ConsoleDirectories;
	fieldAliases: Record<string, string[]>;
	activationDistance: string;
	contextDepth: string;
	eventPrerequisiteDepth: string;
	performance: {
		initialIndexMaxMs: string;
		batchSize: string;
		incrementalP95MaxMs: string;
		searchP95MaxMs: string;
	};
}

export interface ConsoleProjectFormValidation {
	valid: boolean;
	errors: ConsoleProjectFormErrors;
	preview: ConsoleProjectConfig | null;
}

const INTEGER_LIMITS = {
	activationDistance: [1, 5],
	contextDepth: [0, 5],
	eventPrerequisiteDepth: [0, 5],
	'performance.initialIndexMaxMs': [1, 600_000],
	'performance.batchSize': [1, 1_000],
	'performance.incrementalP95MaxMs': [1, 60_000],
	'performance.searchP95MaxMs': [1, 60_000],
} as const satisfies Record<string, readonly [number, number]>;

function normalizePath(value: string): string {
	return value.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '');
}

function cloneAliases(aliases: Record<string, string[]>): Record<string, string[]> {
	return Object.fromEntries(Object.entries(aliases).map(([field, values]) => [field, [...values]]));
}

export function createConsoleProjectFormDraft(project?: ConsoleProjectConfig, index = 0): ConsoleProjectFormDraft {
	const source = project ?? createDefaultConsoleProject('', index);
	return {
		projectId: source.projectId,
		projectCode: source.projectCode,
		root: source.root,
		directories: { ...source.directories },
		fieldAliases: cloneAliases(source.fieldAliases),
		activationDistance: String(source.activationDistance),
		contextDepth: String(source.contextDepth),
		eventPrerequisiteDepth: String(source.eventPrerequisiteDepth),
		performance: {
			initialIndexMaxMs: String(source.performance.initialIndexMaxMs),
			batchSize: String(source.performance.batchSize),
			incrementalP95MaxMs: String(source.performance.incrementalP95MaxMs),
			searchP95MaxMs: String(source.performance.searchP95MaxMs),
		},
	};
}

function readInteger(
	value: string,
	field: ConsoleProjectFormField,
	errors: ConsoleProjectFormErrors,
): number | null {
	const [min, max] = INTEGER_LIMITS[field as keyof typeof INTEGER_LIMITS];
	const trimmed = value.trim();
	if (!/^-?\d+$/.test(trimmed)) {
		errors[field] = '请输入整数。';
		return null;
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
		errors[field] = `请输入 ${min} 到 ${max} 之间的整数。`;
		return null;
	}
	return parsed;
}

export function validateConsoleProjectForm(draft: ConsoleProjectFormDraft): ConsoleProjectFormValidation {
	const errors: ConsoleProjectFormErrors = {};
	const projectId = draft.projectId.trim();
	const projectCode = draft.projectCode.trim();
	const root = normalizePath(draft.root);
	if (!projectId) errors.projectId = '项目 ID 为必填项。';
	if (!projectCode) errors.projectCode = '项目代码为必填项。';
	if (!root) errors.root = '项目根目录为必填项。';

	const directories = {} as ConsoleDirectories;
	for (const key of CONSOLE_DIRECTORY_KEYS) {
		const normalized = normalizePath(draft.directories[key]);
		directories[key] = normalized;
		if (!normalized) errors[`directories.${key}`] = '目录名称为必填项。';
	}

	const activationDistance = readInteger(draft.activationDistance, 'activationDistance', errors);
	const contextDepth = readInteger(draft.contextDepth, 'contextDepth', errors);
	const eventPrerequisiteDepth = readInteger(draft.eventPrerequisiteDepth, 'eventPrerequisiteDepth', errors);
	const initialIndexMaxMs = readInteger(draft.performance.initialIndexMaxMs, 'performance.initialIndexMaxMs', errors);
	const batchSize = readInteger(draft.performance.batchSize, 'performance.batchSize', errors);
	const incrementalP95MaxMs = readInteger(draft.performance.incrementalP95MaxMs, 'performance.incrementalP95MaxMs', errors);
	const searchP95MaxMs = readInteger(draft.performance.searchP95MaxMs, 'performance.searchP95MaxMs', errors);

	if (Object.keys(errors).length > 0) return { valid: false, errors, preview: null };
	return {
		valid: true,
		errors,
		preview: {
			projectId,
			projectCode,
			root,
			directories,
			fieldAliases: cloneAliases(draft.fieldAliases),
			activationDistance: activationDistance!,
			contextDepth: contextDepth!,
			eventPrerequisiteDepth: eventPrerequisiteDepth!,
			performance: { initialIndexMaxMs: initialIndexMaxMs!, batchSize: batchSize!, incrementalP95MaxMs: incrementalP95MaxMs!, searchP95MaxMs: searchP95MaxMs! },
		},
	};
}
