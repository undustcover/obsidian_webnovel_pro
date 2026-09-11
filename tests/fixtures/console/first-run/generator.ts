import { createDefaultConsoleProject, type ConsoleProjectConfig } from '../../../../src/console/config';

export type FirstRunFixtureName = 'empty-config' | 'legacy-workspace' | 'invalid-config' | 'multi-project' | 'zero-file';

export interface FirstRunVaultEntry {
	path: string;
	content: string;
	frontmatter?: Record<string, unknown>;
}

export interface FirstRunFixture {
	name: FirstRunFixtureName;
	settings: {
		consoleProjects?: unknown;
		workspaceFolders?: string[];
		loreFolderName?: string;
	};
	files: FirstRunVaultEntry[];
	expected: {
		projectIds: string[];
		recordCounts: Record<string, number>;
		diagnosticCodes: string[];
	};
}

const project = (projectId: string, root: string, index: number): ConsoleProjectConfig => ({
	...createDefaultConsoleProject(root, index),
	projectId,
});

const FIXTURES: readonly FirstRunFixture[] = [
	{
		name: 'empty-config',
		settings: { consoleProjects: [], workspaceFolders: [] },
		files: [],
		expected: { projectIds: [], recordCounts: {}, diagnosticCodes: [] },
	},
	{
		name: 'legacy-workspace',
		settings: { consoleProjects: [], workspaceFolders: ['旧作'], loreFolderName: '设定' },
		files: [{ path: '旧作/正文/第一章.md', content: '# 第一章', frontmatter: { type: 'chapter', id: 'CH-0001', title: '第一章' } }],
		expected: { projectIds: ['project-1'], recordCounts: { 'project-1': 1 }, diagnosticCodes: ['CONFIG_LEGACY_WORKSPACE_DERIVED'] },
	},
	{
		name: 'invalid-config',
		settings: { consoleProjects: [{ projectId: 'broken', root: '' }], workspaceFolders: ['不得回退'] },
		files: [],
		expected: { projectIds: [], recordCounts: {}, diagnosticCodes: ['CONFIG_INVALID_PROJECT'] },
	},
	{
		name: 'multi-project',
		settings: { consoleProjects: [project('alpha', '甲作', 0), project('beta', '乙作', 1)] },
		files: [
			{ path: '甲作/设定系统/人物/甲.md', content: '# 甲', frontmatter: { type: 'character', id: 'CHR-0001', title: '甲' } },
			{ path: '乙作/事件数据库/开端.md', content: '# 开端', frontmatter: { type: 'event', id: 'EVT-0001', title: '开端' } },
		],
		expected: { projectIds: ['alpha', 'beta'], recordCounts: { alpha: 1, beta: 1 }, diagnosticCodes: [] },
	},
	{
		name: 'zero-file',
		settings: { consoleProjects: [project('empty-novel', '空作品', 0)] },
		files: [],
		expected: { projectIds: ['empty-novel'], recordCounts: { 'empty-novel': 0 }, diagnosticCodes: [] },
	},
];

export function createFirstRunFixtures(): FirstRunFixture[] {
	return structuredClone([...FIXTURES]);
}
