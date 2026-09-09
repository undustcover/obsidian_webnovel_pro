export const MILESTONE_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;
export type MilestoneStatus = typeof MILESTONE_STATUSES[number];
export type MilestoneCompletionMode = 'all' | 'any' | 'sequence' | 'manual';

export interface MilestoneCompletion {
	mode: MilestoneCompletionMode;
	requiredEventIds: string[];
}

export interface MilestoneData {
	storyline: string;
	status: MilestoneStatus | 'unknown';
	completion: MilestoneCompletion;
	relatedPartIds: string[];
	relatedVolumeIds: string[];
	relatedUnitIds: string[];
}

export type MilestoneEvaluation = 'not_ready' | 'completion_ready' | 'indeterminate' | 'manual_review';
