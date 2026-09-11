import { describe, expect, it } from 'vitest';
import { createDefaultConsoleProject, normalizeConsoleProjects, resolveConsoleProjects } from '../../src/console/config';

describe('console project configuration', () => {
	it('derives a read-only runtime mapping from legacy workspace settings', () => {
		const result = resolveConsoleProjects({ workspaceFolders: ['小说\\主线'], loreFolderName: '设定' });
		expect(result.projects[0]).toMatchObject({ projectId: 'project-1', root: '小说/主线', activationDistance: 2 });
		expect(result.projects[0]?.directories.lore).toBe('设定');
		expect(result.source).toBe('workspaceFolders');
		expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'CONFIG_LEGACY_WORKSPACE_DERIVED', severity: 'info' })]);
	});

	it('treats missing explicit and legacy configuration as unconfigured without an error diagnostic', () => {
		expect(resolveConsoleProjects({})).toEqual({ projects: [], diagnostics: [], source: 'none' });
		expect(resolveConsoleProjects({ consoleProjects: [], workspaceFolders: [] })).toEqual({ projects: [], diagnostics: [], source: 'none' });
	});

	it('normalizes paths, aliases and bounded values without touching unrelated data', () => {
		const input = { ...createDefaultConsoleProject('/作品/'), activationDistance: 99, fieldAliases: { title: ['名称', '名称', 1] } };
		const result = normalizeConsoleProjects([input]);
		expect(result.diagnostics).toEqual([]);
		expect(result.source).toBe('consoleProjects');
		expect(result.projects[0]?.root).toBe('作品');
		expect(result.projects[0]?.activationDistance).toBe(2);
		expect(result.projects[0]?.fieldAliases.title).toEqual(['名称']);
	});

	it('isolates invalid and duplicate projects with diagnostics', () => {
		const base = createDefaultConsoleProject('作品');
		const result = normalizeConsoleProjects([null, base, { ...base, root: '另一作品' }, { ...base, projectId: 'other' }]);
		expect(result.projects).toHaveLength(1);
		expect(result.diagnostics.map((item) => item.code)).toEqual([
			'CONFIG_INVALID_PROJECT', 'CONFIG_DUPLICATE_PROJECT_ID', 'CONFIG_DUPLICATE_ROOT',
		]);
		expect(result.diagnostics.every((item) => item.severity === 'error')).toBe(true);
	});

	it.each([
		['invalid project', [null], ['CONFIG_INVALID_PROJECT']],
		['duplicate ID', [createDefaultConsoleProject('一'), { ...createDefaultConsoleProject('二'), projectId: 'project-1' }], ['CONFIG_DUPLICATE_PROJECT_ID']],
		['duplicate root', [createDefaultConsoleProject('一'), { ...createDefaultConsoleProject('一', 1) }], ['CONFIG_DUPLICATE_ROOT']],
	] as const)('preserves valid entries while diagnosing %s', (_label, input, codes) => {
		const result = normalizeConsoleProjects(input);
		expect(result.diagnostics.map((item) => item.code)).toEqual(codes);
		expect(result.projects.every((project) => project.root.length > 0)).toBe(true);
	});
});
