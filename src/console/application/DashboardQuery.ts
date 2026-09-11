import type { IndexSnapshot } from '../indexing';
import type { ProjectState } from '../persistence/ProjectStateRepository';
import { ChapterWorkspaceQuery, type ChapterWorkspace } from './ChapterWorkspaceQuery';
import { ActionProjectionService, type ActionItem } from './ActionProjectionService';
import { HealthRuleRegistry } from './HealthRuleRegistry';
import { createUnconfiguredState, type ConsoleAvailabilityState } from '../domain';

export interface DashboardModel {
	configured: boolean;
	currentFocus?: string;
	storylineCursors: Record<string, string>;
	chapterWorkspace?: ChapterWorkspace;
	indexStatus: string;
	availability: ConsoleAvailabilityState;
	healthCount: number;
	actionGroups: { now: ActionItem[]; missed: ActionItem[]; upcoming: ActionItem[]; later: ActionItem[]; needs_confirmation: ActionItem[] };
}

export class DashboardQuery {
	constructor(
		private readonly snapshotProvider: () => IndexSnapshot | undefined,
		private readonly availabilityProvider: () => ConsoleAvailabilityState = createUnconfiguredState,
	) {}
	execute(state: ProjectState | null): DashboardModel {
		const snapshot = this.snapshotProvider();
		const currentFocus = state?.currentFocus || undefined;
		const focusRecord = currentFocus ? snapshot?.idRegistry.resolve(currentFocus) || snapshot?.byKey.get(currentFocus) : undefined;
		const chapterWorkspace = focusRecord?.type === 'chapter' ? new ChapterWorkspaceQuery(this.snapshotProvider).execute(focusRecord.key) : undefined;
		const health = snapshot ? new HealthRuleRegistry().evaluate(snapshot, state) : [];
		const actions: ActionItem[] = snapshot ? new ActionProjectionService(snapshot, state).project() : [];
		for (const item of health.filter(entry => entry.ruleId === 'PROG_FORESHADOWING_OVERDUE' || entry.ruleId === 'PROG_FORESHADOWING_ANCHOR_PASSED')) actions.push({ key: item.entityKey, title: item.entityKey, group: item.ruleId.endsWith('ANCHOR_PASSED') ? 'missed' : 'upcoming', source: 'foreshadowing', reason: item.message, anchorIds: item.evidence.flatMap(evidence => typeof evidence.value === 'string' ? [evidence.value] : []), priority: 'normal' });
		const group = (name: ActionItem['group']) => actions.filter(item => item.group === name);
		const availability = this.availabilityProvider();
		return {
			configured: Boolean(state), currentFocus, storylineCursors: { ...(state?.storylineCursors || {}) }, chapterWorkspace,
			indexStatus: availability.status, availability, healthCount: health.length,
			actionGroups: { now: group('now'), missed: group('missed'), upcoming: group('upcoming'), later: group('later'), needs_confirmation: group('needs_confirmation') },
		};
	}
}
