export const CONSOLE_DIRECTORY_KEYS = [
	'control', 'narrative', 'manuscript', 'lore', 'events', 'materials', 'context',
] as const;

export type ConsoleDirectoryKey = typeof CONSOLE_DIRECTORY_KEYS[number];
export type ConsoleDirectories = Record<ConsoleDirectoryKey, string>;

export interface ConsolePerformanceConfig {
	initialIndexMaxMs: number;
	batchSize: number;
	incrementalP95MaxMs: number;
	searchP95MaxMs: number;
}

export interface ConsoleProjectConfig {
	projectId: string;
	projectCode: string;
	root: string;
	directories: ConsoleDirectories;
	fieldAliases: Record<string, string[]>;
	activationDistance: number;
	contextDepth: number;
	eventPrerequisiteDepth: number;
	performance: ConsolePerformanceConfig;
}

export interface ConsoleConfigDiagnostic {
	code: 'CONFIG_INVALID_PROJECT' | 'CONFIG_DUPLICATE_PROJECT_ID' | 'CONFIG_DUPLICATE_ROOT';
	index: number;
	message: string;
}

export interface NormalizedConsoleProjects {
	projects: ConsoleProjectConfig[];
	diagnostics: ConsoleConfigDiagnostic[];
}

export const DEFAULT_CONSOLE_DIRECTORIES: Readonly<ConsoleDirectories> = Object.freeze({
	control: '总控系统',
	narrative: '叙事系统',
	manuscript: '正文',
	lore: '设定系统',
	events: '事件数据库',
	materials: '创作素材',
	context: 'Codex上下文',
});

export const DEFAULT_CONSOLE_PERFORMANCE: Readonly<ConsolePerformanceConfig> = Object.freeze({
	initialIndexMaxMs: 30_000,
	batchSize: 50,
	incrementalP95MaxMs: 500,
	searchP95MaxMs: 100,
});

const normalizePath = (value: string): string => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const boundedInteger = (value: unknown, fallback: number, min: number, max: number): number =>
	Number.isInteger(value) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;

export function createDefaultConsoleProject(root: string, index = 0, loreDirectory = '设定系统'): ConsoleProjectConfig {
	const normalizedRoot = normalizePath(root);
	return {
		projectId: `project-${index + 1}`,
		projectCode: `NOVEL-${index + 1}`,
		root: normalizedRoot,
		directories: { ...DEFAULT_CONSOLE_DIRECTORIES, lore: loreDirectory || DEFAULT_CONSOLE_DIRECTORIES.lore },
		fieldAliases: {},
		activationDistance: 2,
		contextDepth: 1,
		eventPrerequisiteDepth: 2,
		performance: { ...DEFAULT_CONSOLE_PERFORMANCE },
	};
}

function normalizeProject(raw: unknown, index: number): ConsoleProjectConfig | null {
	if (!raw || typeof raw !== 'object') return null;
	const input = raw as Record<string, unknown>;
	if (typeof input.projectId !== 'string' || !input.projectId.trim() || typeof input.root !== 'string' || !input.root.trim()) return null;
	const directoryInput = input.directories && typeof input.directories === 'object' ? input.directories as Record<string, unknown> : {};
	const directories = { ...DEFAULT_CONSOLE_DIRECTORIES };
	for (const key of CONSOLE_DIRECTORY_KEYS) {
		if (typeof directoryInput[key] === 'string' && directoryInput[key]) directories[key] = normalizePath(directoryInput[key]);
	}
	const aliases: Record<string, string[]> = {};
	if (input.fieldAliases && typeof input.fieldAliases === 'object' && !Array.isArray(input.fieldAliases)) {
		for (const [field, values] of Object.entries(input.fieldAliases as Record<string, unknown>)) {
			if (Array.isArray(values)) aliases[field] = [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
		}
	}
	const performanceInput = input.performance && typeof input.performance === 'object' ? input.performance as Record<string, unknown> : {};
	return {
		projectId: input.projectId.trim(),
		projectCode: typeof input.projectCode === 'string' && input.projectCode.trim() ? input.projectCode.trim() : `NOVEL-${index + 1}`,
		root: normalizePath(input.root),
		directories,
		fieldAliases: aliases,
		activationDistance: boundedInteger(input.activationDistance, 2, 1, 5),
		contextDepth: boundedInteger(input.contextDepth, 1, 0, 5),
		eventPrerequisiteDepth: boundedInteger(input.eventPrerequisiteDepth, 2, 0, 5),
		performance: {
			initialIndexMaxMs: boundedInteger(performanceInput.initialIndexMaxMs, DEFAULT_CONSOLE_PERFORMANCE.initialIndexMaxMs, 1, 600_000),
			batchSize: boundedInteger(performanceInput.batchSize, DEFAULT_CONSOLE_PERFORMANCE.batchSize, 1, 1_000),
			incrementalP95MaxMs: boundedInteger(performanceInput.incrementalP95MaxMs, DEFAULT_CONSOLE_PERFORMANCE.incrementalP95MaxMs, 1, 60_000),
			searchP95MaxMs: boundedInteger(performanceInput.searchP95MaxMs, DEFAULT_CONSOLE_PERFORMANCE.searchP95MaxMs, 1, 60_000),
		},
	};
}

export function normalizeConsoleProjects(raw: unknown): NormalizedConsoleProjects {
	if (!Array.isArray(raw)) return { projects: [], diagnostics: [] };
	const projects: ConsoleProjectConfig[] = [];
	const diagnostics: ConsoleConfigDiagnostic[] = [];
	const ids = new Set<string>();
	const roots = new Set<string>();
	raw.forEach((value, index) => {
		const project = normalizeProject(value, index);
		if (!project) {
			diagnostics.push({ code: 'CONFIG_INVALID_PROJECT', index, message: 'Project id and root are required.' });
			return;
		}
		if (ids.has(project.projectId)) {
			diagnostics.push({ code: 'CONFIG_DUPLICATE_PROJECT_ID', index, message: `Duplicate project id: ${project.projectId}` });
			return;
		}
		if (roots.has(project.root)) {
			diagnostics.push({ code: 'CONFIG_DUPLICATE_ROOT', index, message: `Duplicate project root: ${project.root}` });
			return;
		}
		ids.add(project.projectId);
		roots.add(project.root);
		projects.push(project);
	});
	return { projects, diagnostics };
}

export function resolveConsoleProjects(settings: {
	consoleProjects?: unknown;
	workspaceFolders?: string[];
	loreFolderName?: string;
}): NormalizedConsoleProjects {
	const normalized = normalizeConsoleProjects(settings.consoleProjects);
	if (normalized.projects.length > 0 || normalized.diagnostics.length > 0) return normalized;
	return {
		projects: (settings.workspaceFolders || []).map((root, index) => createDefaultConsoleProject(root, index, settings.loreFolderName || '设定系统')),
		diagnostics: [],
	};
}
