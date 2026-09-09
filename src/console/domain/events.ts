export const EVENT_STATUSES = ['planned', 'possible', 'occurring', 'occurred', 'cancelled', 'superseded'] as const;
export type EventStatus = typeof EVENT_STATUSES[number];
export const NARRATIVE_STATUSES = ['unassigned', 'outlined', 'chapter_assigned', 'writing', 'written', 'published'] as const;
export type NarrativeStatus = typeof NARRATIVE_STATUSES[number];
export const READER_STATES = ['unknown', 'hinted', 'partial', 'misled', 'revealed'] as const;
export type ReaderState = typeof READER_STATES[number];
export const IMPORTANCE_LEVELS = ['minor', 'normal', 'major', 'critical'] as const;
export type Importance = typeof IMPORTANCE_LEVELS[number];

export interface StoryTime {
	display: string;
	sortKey?: string;
	calendar?: string;
	precision: 'instant' | 'day' | 'month' | 'season' | 'year' | 'era' | 'relative' | 'unknown';
}

export interface TimelineViewConfig {
	visible: boolean;
	importance?: Importance | 'unknown';
}

export interface KnowledgeState {
	author: 'full';
	reader: ReaderState | 'unknown';
	povCharacters: Record<string, 'unknown' | 'hinted' | 'partial' | 'full' | 'misled'>;
	allowedReveal?: string;
}

export interface EventData {
	eventStatus: EventStatus | 'unknown';
	narrativeStatus: NarrativeStatus | 'unknown';
	readerState: ReaderState | 'unknown';
	storyTime?: StoryTime;
	storyTimeEnd?: StoryTime | null;
	timelineOrder?: number;
	storyline: string;
	prerequisiteEventIds: string[];
	currentPlanIds: string[];
	currentChapterIds: string[];
	characterIds: string[];
	organizationIds: string[];
	locationIds: string[];
	itemIds: string[];
	timelineViews: {
		reality?: TimelineViewConfig;
		hiddenWorld?: TimelineViewConfig;
		cosmic?: TimelineViewConfig;
		characters: Record<string, Importance | 'unknown'>;
		organizations: Record<string, Importance | 'unknown'>;
	};
	knowledgeState: KnowledgeState;
	causes: string[];
	results: string[];
	longTermImpacts: string[];
	evidenceFiles: string[];
}
