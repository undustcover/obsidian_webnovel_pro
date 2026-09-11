import { describe, expect, it, vi } from 'vitest';
import { persistOnboardingProject, renderOnboardingPage } from '../../src/console/ui';
import { createDefaultConsoleProject } from '../../src/console/config';
import { FakeElement } from './fake-element';

describe('Console onboarding page', () => {
	it('renders native keyboard controls and Vault folder candidates', () => {
		const root = new FakeElement();
		renderOnboardingPage(root as unknown as HTMLElement, { folderCandidates: ['作品二', '作品一', '作品一'], onSave: vi.fn(), onCancel: vi.fn() });
		expect(root.findAll('form')).toHaveLength(1);
		expect(root.findAll('input')).toHaveLength(10);
		expect(new Set(root.findAll('option').map(option => option.value))).toEqual(new Set(['作品一', '作品二']));
		const buttons = root.findAll('button');
		expect(buttons.map(button => button.textContent)).toEqual(['保存配置', '取消']);
		expect(buttons.map(button => button.attributes.type)).toEqual(['submit', 'button']);
	});

	it('rejects invalid submission without calling save', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const root = new FakeElement();
		const session = renderOnboardingPage(root as unknown as HTMLElement, { folderCandidates: [], onSave: save, onCancel: vi.fn() });
		expect(await session.submit()).toBe(false);
		expect(save).not.toHaveBeenCalled();
		expect(session.errors.root).toBeTruthy();
		expect(root.textContent).toContain('请修正标出的配置字段');
	});

	it('normalizes and saves one valid project through the supplied settings boundary', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const root = new FakeElement();
		const session = renderOnboardingPage(root as unknown as HTMLElement, { folderCandidates: ['小说/主线'], onSave: save, onCancel: vi.fn() });
		session.draft.root = '/小说\\主线/';
		expect(await session.submit()).toBe(true);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project-1', root: '小说/主线' }));
		expect(session.status).toBe('saved');
		expect(root.textContent).toContain('项目配置已保存');
	});

	it('connects the native form submit event to saving', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const root = new FakeElement();
		const session = renderOnboardingPage(root as unknown as HTMLElement, { folderCandidates: [], onSave: save, onCancel: vi.fn() });
		session.draft.root = '/测试小说/';
		root.findAll('form')[0]?.dispatch('submit');
		await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
		expect(save).toHaveBeenCalledWith(expect.objectContaining({ root: '测试小说' }));
		expect(session.status).toBe('saved');
	});

	it('cancel has zero writes and reports cancellation', () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const cancel = vi.fn();
		const root = new FakeElement();
		const session = renderOnboardingPage(root as unknown as HTMLElement, { folderCandidates: [], onSave: save, onCancel: cancel });
		session.cancel();
		expect(save).not.toHaveBeenCalled();
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(session.status).toBe('cancelled');
		expect(root.textContent).toContain('未保存任何配置');
	});

	it('shows save failures and permits retry', async () => {
		const save = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(undefined);
		const root = new FakeElement();
		const session = renderOnboardingPage(root as unknown as HTMLElement, { folderCandidates: [], onSave: save, onCancel: vi.fn() });
		session.draft.root = '作品';
		expect(await session.submit()).toBe(false);
		expect(session.message).toContain('disk full');
		expect(await session.submit()).toBe(true);
		expect(save).toHaveBeenCalledTimes(2);
	});

	it('persists through plugin settings and restores the old array when disk save fails', async () => {
		const existing = createDefaultConsoleProject('旧作品');
		const incoming = createDefaultConsoleProject('新作品', 1);
		const settings = { consoleProjects: [existing] };
		await expect(persistOnboardingProject(settings, incoming, vi.fn().mockRejectedValue(new Error('disk full')))).rejects.toThrow('disk full');
		expect(settings.consoleProjects).toEqual([existing]);
		const save = vi.fn().mockResolvedValue(undefined);
		await persistOnboardingProject(settings, incoming, save);
		expect(settings.consoleProjects).toEqual([existing, incoming]);
		expect(save).toHaveBeenCalledTimes(1);
	});
});
