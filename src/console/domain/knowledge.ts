import type { CanonStatus, ContextScope, EntityTypeValue, LifecycleStatus, ReviewStatus } from './entities';

export type ContextInclusion = 'auto_included' | 'manual_included' | 'manual_excluded';

export interface KnowledgeBoundary {
	reader: string;
	pov: Record<string, string>;
	allowedReveal: string;
}

export interface ContextItem {
	key: string;
	id?: string;
	path: string;
	anchor?: string;
	type: EntityTypeValue;
	title: string;
	inclusion: ContextInclusion;
	reasons: string[];
	relationship: string;
	canon: CanonStatus | 'unknown';
	lifecycleStatus: LifecycleStatus | 'unknown';
	contextScope: ContextScope | 'unknown';
	reviewStatus: ReviewStatus | 'unknown';
	containsUnrevealed: boolean;
	knowledgeBoundary: KnowledgeBoundary;
	hasConflict: boolean;
	modifiedAt: string;
	lastReviewed?: string;
	summary: string;
}

export type ContextTargetKind = 'focus' | 'event' | 'milestone' | 'storyline' | 'chapter' | 'unit' | 'task' | 'character' | 'custom';

export interface ContextPlan {
	schemaVersion: 'console.context.v1';
	planId: string;
	target: { kind: ContextTargetKind; key: string };
	generatedAt: string;
	snapshotVersion: string;
	policy: {
		relationDepth: number;
		eventPrerequisiteDepth: number;
		defaultGovernance: 'canon-active-current';
	};
	items: ContextItem[];
	conflicts: string[];
}
