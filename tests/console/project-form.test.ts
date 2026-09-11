import { describe, expect, it } from 'vitest';
import {
	createConsoleProjectFormDraft,
	createDefaultConsoleProject,
	normalizeConsoleProjects,
	validateConsoleProjectForm,
} from '../../src/console/config';

describe('console project form model', () => {
	it('creates a draft with directory and integer defaults without saving anything', () => {
		const draft = createConsoleProjectFormDraft(undefined, 2);
		expect(draft).toMatchObject({ projectId: 'project-3', projectCode: 'NOVEL-3', root: '', activationDistance: '2' });
		expect(draft.directories).toMatchObject({ control: '总控系统', lore: '设定系统', context: 'Codex上下文' });
	});

	it('reports required fields and does not expose a partial preview', () => {
		const draft = createConsoleProjectFormDraft();
		draft.projectId = ' ';
		draft.projectCode = '';
		draft.directories.lore = '///';
		const result = validateConsoleProjectForm(draft);
		expect(result.valid).toBe(false);
		expect(result.preview).toBeNull();
		expect(result.errors.projectId).toBeTruthy();
		expect(result.errors.projectCode).toBeTruthy();
		expect(result.errors.root).toBeTruthy();
		expect(result.errors['directories.lore']).toBeTruthy();
	});

	it('normalizes root and custom directory aliases in the preview', () => {
		const draft = createConsoleProjectFormDraft(createDefaultConsoleProject('旧目录'));
		draft.root = ' /小说\\主线// ';
		draft.directories.control = '/控制台\\资料/';
		draft.directories.lore = ' 世界观//设定 ';
		const result = validateConsoleProjectForm(draft);
		expect(result.preview?.root).toBe('小说/主线');
		expect(result.preview?.directories).toMatchObject({ control: '控制台/资料', lore: '世界观/设定' });
	});

	it.each([
		['activationDistance', '0'],
		['contextDepth', '6'],
		['eventPrerequisiteDepth', '1.5'],
	] as const)('rejects invalid boundary value for %s', (field, value) => {
		const draft = createConsoleProjectFormDraft(createDefaultConsoleProject('作品'));
		draft[field] = value;
		const result = validateConsoleProjectForm(draft);
		expect(result.errors[field]).toBeTruthy();
	});

	it('accepts inclusive integer boundaries and produces input for the existing normalizer', () => {
		const draft = createConsoleProjectFormDraft(createDefaultConsoleProject('作品'));
		draft.activationDistance = '5';
		draft.contextDepth = '0';
		draft.eventPrerequisiteDepth = '5';
		draft.performance.batchSize = '1000';
		const result = validateConsoleProjectForm(draft);
		expect(result.valid).toBe(true);
		expect(normalizeConsoleProjects([result.preview])).toEqual({ projects: [result.preview], diagnostics: [], source: 'consoleProjects' });
	});

	it('copies advanced aliases so editing a draft cannot mutate saved configuration', () => {
		const project = { ...createDefaultConsoleProject('作品'), fieldAliases: { title: ['名称'] } };
		const draft = createConsoleProjectFormDraft(project);
		draft.fieldAliases.title?.push('标题');
		expect(project.fieldAliases.title).toEqual(['名称']);
	});
});
