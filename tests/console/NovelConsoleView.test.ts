import { describe, expect, it, vi } from 'vitest';
import { TFile, WorkspaceLeaf } from 'obsidian';
import { NOVEL_CONSOLE_VIEW_TYPE, NovelConsoleView } from '../../src/console/ui/NovelConsoleView';
import type { WebNovelAssistantPlugin } from '../../src/types/plugin';

describe('NovelConsoleView', () => {
	it('has a stable ItemView type, restores state, and opens Markdown in an adjacent leaf', async () => {
		const file = Object.assign(new TFile(), { name: '事件.md', basename: '事件', path: '小说/事件.md', extension: 'md' });
		const openFile = vi.fn().mockResolvedValue(undefined);
		const adjacentLeaf = { openFile };
		const ensureImmersiveMode = vi.fn().mockResolvedValue(undefined);
		const getAbstractFileByPath = vi.fn().mockReturnValue(file);
		const plugin = {
			services: { getOptional: vi.fn() },
			immersiveModeManager: { ensureImmersiveMode },
			app: { vault: { getAbstractFileByPath }, workspace: { getLeaf: vi.fn().mockReturnValue(adjacentLeaf), setActiveLeaf: vi.fn() } },
		} as unknown as WebNovelAssistantPlugin;
		const leaf = new WorkspaceLeaf();
		Object.assign(leaf, { app: plugin.app });
		const view = new NovelConsoleView(leaf, plugin);
		expect(view.getViewType()).toBe(NOVEL_CONSOLE_VIEW_TYPE);
		await view.setState({ page: 'events/reality', filters: { query: '雨夜' }, detailsOpen: false });
		expect(view.getState()).toMatchObject({ page: 'events/reality', filters: { query: '雨夜' } });
		expect(await view.openSource('小说/事件.md')).toBe(true);
		expect(openFile).toHaveBeenCalledWith(file);
		expect(await view.openImmersiveSource('小说/事件.md')).toBe(true);
		expect(plugin.app.workspace.setActiveLeaf).toHaveBeenCalledWith(adjacentLeaf, { focus: true });
		expect(ensureImmersiveMode).toHaveBeenCalledOnce();
		getAbstractFileByPath.mockReturnValue(null);
		expect(await view.openImmersiveSource('missing.md')).toBe(false);
		await view.onClose();
	});
});
