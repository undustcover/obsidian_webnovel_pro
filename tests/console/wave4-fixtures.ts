import type { EventData } from '../../src/console/domain';
import { record } from './wave3-fixtures';

export function eventData(overrides: Partial<EventData> = {}): EventData {
	return {
		eventStatus: 'planned', narrativeStatus: 'unassigned', readerState: 'unknown', storyline: '主线',
		prerequisiteEventIds: [], currentPlanIds: [], currentChapterIds: [], characterIds: [], organizationIds: [], locationIds: [], itemIds: [],
		timelineViews: { characters: {}, organizations: {} }, knowledgeState: { author: 'full', reader: 'unknown', povCharacters: {} },
		causes: [], results: [], longTermImpacts: [], evidenceFiles: [], ...overrides,
	};
}

export function eventRecord(id: string, overrides: Partial<EventData> = {}) {
	const data = eventData(overrides);
	return record('event', id, {
		title: id, event_status: data.eventStatus, narrative_status: data.narrativeStatus, reader_state: data.readerState,
		story_time: data.storyTime, story_time_end: data.storyTimeEnd, timeline_order: data.timelineOrder, storyline: data.storyline,
		prerequisite_event_ids: data.prerequisiteEventIds, current_plan_ids: data.currentPlanIds, current_chapter_ids: data.currentChapterIds,
		character_ids: data.characterIds, organization_ids: data.organizationIds, location_ids: data.locationIds, item_ids: data.itemIds,
		timeline_views: { reality: data.timelineViews.reality, hidden_world: data.timelineViews.hiddenWorld, cosmic: data.timelineViews.cosmic, characters: data.timelineViews.characters, organizations: data.timelineViews.organizations },
		knowledge_state: { author: 'full', reader: data.knowledgeState.reader, pov_characters: data.knowledgeState.povCharacters },
		causes: data.causes, results: data.results, long_term_impacts: data.longTermImpacts, evidence_files: data.evidenceFiles,
	});
}
