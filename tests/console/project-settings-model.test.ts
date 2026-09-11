import { describe, expect, it, vi } from 'vitest';
import { ConsoleProjectsSettingsModel, createDefaultConsoleProject, persistConsoleProjects } from '../../src/console/config';

describe('ConsoleProjectsSettingsModel', () => {
	it('adds and removes basic project drafts without persisting', () => {
		const model = new ConsoleProjectsSettingsModel([createDefaultConsoleProject('作品一')]);
		const added = model.addProject();
		expect(added.projectId).toBe('project-2');
		expect(model.drafts).toHaveLength(2);
		model.removeProject(0);
		expect(model.drafts.map(draft => draft.projectId)).toEqual(['project-2']);
	});

	it('does not overwrite settings when a basic field is invalid', async () => {
		const model = new ConsoleProjectsSettingsModel([createDefaultConsoleProject('作品')]);
		model.drafts[0].root = '';
		const persist = vi.fn().mockResolvedValue(undefined);
		const result = await model.save(persist);
		expect(result.projects).toBeNull();
		expect(result.fieldErrors[0]?.root).toBeTruthy();
		expect(persist).not.toHaveBeenCalled();
	});

	it('diagnoses duplicate projects before persistence', async () => {
		const model = new ConsoleProjectsSettingsModel([createDefaultConsoleProject('作品一'), createDefaultConsoleProject('作品二', 1)]);
		model.drafts[1].projectId = 'project-1';
		const result = await model.save(vi.fn());
		expect(result.projects).toBeNull();
		expect(result.diagnostics.map(item => item.code)).toEqual(['CONFIG_DUPLICATE_PROJECT_ID']);
	});

	it('applies valid advanced JSON to the same drafts but rejects invalid JSON without changing them', () => {
		const model = new ConsoleProjectsSettingsModel([createDefaultConsoleProject('作品一')]);
		const before = model.toAdvancedJson();
		expect(model.applyAdvancedJson('{bad').applied).toBe(false);
		expect(model.toAdvancedJson()).toBe(before);
		const next = [{ ...createDefaultConsoleProject('作品二'), projectId: 'p2' }];
		expect(model.applyAdvancedJson(JSON.stringify(next))).toEqual({ applied: true });
		expect(model.drafts[0]).toMatchObject({ projectId: 'p2', root: '作品二' });
	});

	it('undo restores the last successfully saved projects', async () => {
		const model = new ConsoleProjectsSettingsModel([createDefaultConsoleProject('旧作品')]);
		model.drafts[0].root = '新作品';
		await model.save(vi.fn().mockResolvedValue(undefined));
		model.drafts[0].root = '未保存';
		model.undo();
		expect(model.drafts[0]?.root).toBe('新作品');
	});

	it('restores plugin settings if the settings write fails', async () => {
		const oldProject = createDefaultConsoleProject('旧作品');
		const settings = { consoleProjects: [oldProject] };
		await expect(persistConsoleProjects(settings, [createDefaultConsoleProject('新作品')], vi.fn().mockRejectedValue(new Error('disk full')))).rejects.toThrow('disk full');
		expect(settings.consoleProjects).toEqual([oldProject]);
	});

	it('persists the old settings again when atomic runtime reconfiguration fails', async () => {
		const oldProject = createDefaultConsoleProject('旧作品');
		const settings = { consoleProjects: [oldProject] };
		const save = vi.fn().mockResolvedValue(undefined);
		await expect(persistConsoleProjects(settings, [createDefaultConsoleProject('新作品')], save, vi.fn().mockRejectedValue(new Error('scan failed')))).rejects.toThrow('scan failed');
		expect(settings.consoleProjects).toEqual([oldProject]);
		expect(save).toHaveBeenCalledTimes(2);
	});
});
