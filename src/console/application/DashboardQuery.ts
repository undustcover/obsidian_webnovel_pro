import type { IndexSnapshot } from '../indexing';
import type { ProjectState } from '../persistence/ProjectStateRepository';
import { ChapterWorkspaceQuery, type ChapterWorkspace } from './ChapterWorkspaceQuery';

export interface DashboardModel {
	configured: boolean;
	currentFocus?: string;
	storylineCursors: Record<string, string>;
	chapterWorkspace?: ChapterWorkspace;
	indexStatus: string;
	healthCount: number;
	actionGroups: { now: string[]; missed: string[]; upcoming: string[]; later: string[] };
}

export class DashboardQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}
	execute(state: ProjectState | null): DashboardModel {
		const snapshot = this.snapshotProvider();
		const currentFocus = state?.currentFocus;
		const focusRecord = currentFocus ? snapshot?.idRegistry.resolve(currentFocus) || snapshot?.byKey.get(currentFocus) : undefined;
		const chapterWorkspace = focusRecord?.type === 'chapter' ? new ChapterWorkspaceQuery(this.snapshotProvider).execute(focusRecord.key) : undefined;
		return {
			configured: Boolean(state), currentFocus, storylineCursors: { ...(state?.storylineCursors || {}) }, chapterWorkspace,
			indexStatus: snapshot ? 'idle' : 'error', healthCount: snapshot?.diagnostics.length || 0,
			actionGroups: { now: [], missed: [], upcoming: [], later: [] },
		};
	}
}
