import { describe, expect, it } from 'vitest';
import { createDefaultConsoleProject, normalizeConsoleProjects, resolveConsoleProjects } from '../../src/console/config';

describe('console project configuration', () => {
	it('derives a read-only runtime mapping from legacy workspace settings', () => {
		const result = resolveConsoleProjects({ workspaceFolders: ['小说\\主线'], loreFolderName: '设定' });
		expect(result.projects[0]).toMatchObject({ projectId: 'project-1', root: '小说/主线', activationDistance: 2 });
		expect(result.projects[0]?.directories.lore).toBe('设定');
	});

	it('normalizes paths, aliases and bounded values without touching unrelated data', () => {
		const input = { ...createDefaultConsoleProject('/作品/'), activationDistance: 99, fieldAliases: { title: ['名称', '名称', 1] } };
		const result = normalizeConsoleProjects([input]);
		expect(result.diagnostics).toEqual([]);
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
	});
});
