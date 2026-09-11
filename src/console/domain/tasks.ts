export const TASK_STATUSES = ['planned', 'active', 'blocked', 'completed', 'cancelled'] as const;
export type CreativeTaskStatus = typeof TASK_STATUSES[number];
export const ACTIVATION_RELATIONS = ['before', 'approaching', 'at', 'after', 'between', 'blocked_by'] as const;
export type ActivationRelation = typeof ACTIVATION_RELATIONS[number];

export type TaskActivation =
	| { relation: 'before' | 'approaching' | 'at' | 'after'; anchorType: 'event' | 'milestone'; anchorId: string }
	| { relation: 'between'; anchorType: 'event' | 'milestone'; startAnchorId: string; endAnchorId: string }
	| { relation: 'blocked_by'; anchorType: 'event' | 'task'; blockerIds: string[] };

export interface CreativeTaskData {
	taskKind: string;
	status: CreativeTaskStatus | 'unknown';
	priority: 'low' | 'normal' | 'high' | 'critical' | 'unknown';
	relatedObjectIds: string[];
	activation: TaskActivation;
	blockedByIds: string[];
	dueAt?: string;
}

export type ActionGroup = 'now' | 'upcoming' | 'missed' | 'later' | 'needs_confirmation';
export type SuggestionDecision = 'handled' | 'converted_to_task' | 'snoozed' | 'ignored_once' | 'not_applicable';

export interface SuggestionIdentityInput {
	ruleId: string;
	targetKey: string;
	anchorId?: string;
}

export function createSuggestionId(input: SuggestionIdentityInput): string {
	return `SUG:${input.ruleId}:${input.targetKey}:${input.anchorId || 'none'}`;
}

export function canTransitionTaskStatus(from: CreativeTaskStatus | 'unknown', to: CreativeTaskStatus): boolean {
	if (from === 'unknown' || from === to) return false;
	const allowed: Readonly<Record<CreativeTaskStatus, readonly CreativeTaskStatus[]>> = {
		planned: ['active', 'blocked', 'cancelled'], active: ['blocked', 'completed', 'cancelled'],
		blocked: ['active', 'completed', 'cancelled'], completed: ['active'], cancelled: ['active'],
	};
	return allowed[from].includes(to);
}
