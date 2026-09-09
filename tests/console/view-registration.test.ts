import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/ui/StatusView', () => ({ WritingStatusView: class {}, STATUS_VIEW_TYPE: 'status-view' }));
vi.mock('../../src/ui/ForeshadowingView', () => ({ ForeshadowingView: class {}, FORESHADOWING_VIEW_TYPE: 'foreshadowing-view' }));
vi.mock('../../src/ui/TimelineView', () => ({ TimelineView: class {}, TIMELINE_VIEW_TYPE: 'wn-timeline-view' }));
vi.mock('../../src/ui/ImmersiveChapterListView', () => ({ ImmersiveChapterListView: class {} }));
vi.mock('../../src/ui/ImmersiveStickyNotesView', () => ({ ImmersiveStickyNotesView: class {} }));
vi.mock('../../src/ui/StickyNoteListView', () => ({ StickyNoteListView: class {} }));
vi.mock('../../src/ui/ChapterOverviewView', () => ({ ChapterOverviewView: class {}, CORKBOARD_VIEW_TYPE: 'webnovel-corkboard' }));
vi.mock('../../src/ui/LoreOverviewView', () => ({ LoreOverviewView: class {}, LORE_OVERVIEW_VIEW_TYPE: 'webnovel-lore-overview' }));
vi.mock('../../src/ui/WorkbenchView', () => ({ WorkbenchView: class {}, WORKBENCH_VIEW_TYPE: 'webnovel-workbench' }));
vi.mock('../../src/ui/RelationGraphView', () => ({ RelationGraphView: class {}, RELATION_GRAPH_VIEW_TYPE: 'webnovel-relation-graph' }));
import { Platform } from 'obsidian';
import { ViewManager } from '../../src/core/ViewManager';
import { NOVEL_CONSOLE_VIEW_TYPE } from '../../src/console/ui/NovelConsoleView';
import type { WebNovelAssistantPlugin } from '../../src/types/plugin';

describe('Console view registration', () => {
	it('registers Console only on desktop while preserving legacy views', () => {
		Platform.isMobile = false;
		const registerView = vi.fn();
		const manager = new ViewManager({ registerView } as unknown as WebNovelAssistantPlugin);
		manager.registerAllViews();
		const types = registerView.mock.calls.map(call => call[0]);
		expect(types).toContain(NOVEL_CONSOLE_VIEW_TYPE);
		expect(types).toContain('status-view');
		expect(types).toContain('webnovel-workbench');
	});

	it('does not register Console on mobile', () => {
		Platform.isMobile = true;
		const registerView = vi.fn();
		new ViewManager({ registerView } as unknown as WebNovelAssistantPlugin).registerAllViews();
		expect(registerView.mock.calls.map(call => call[0])).not.toContain(NOVEL_CONSOLE_VIEW_TYPE);
		Platform.isMobile = false;
	});
});
