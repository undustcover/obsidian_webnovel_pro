import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { classifyCommandRisk } from '../../src/console/application/commands';
import type { ChangePreview } from '../../src/console/application';
import { CHANGE_PLAN_SCHEMA_VERSION, IMPACT_REPORT_SCHEMA_VERSION } from '../../src/console/domain';
import { ConsoleActionRunner } from '../../src/console/ui';

const viewSource = readFileSync('src/console/ui/NovelConsoleView.ts', 'utf8');
const applicationSource = readFileSync('src/console/application/ConsoleApplication.ts', 'utf8');
const contractSource = [
	applicationSource, viewSource,
	...['CurrentStagePage.ts', 'CurrentTasksPage.ts', 'EventAuthoringPage.ts', 'ForeshadowingDetails.ts', 'ContextPage.ts'].map(file => readFileSync(`src/console/ui/${file}`, 'utf8')),
	...['ProjectStateRepository.ts', 'EventRepository.ts', 'CreativeTaskRepository.ts', 'ContextOutputRepository.ts'].map(file => readFileSync(`src/console/persistence/${file}`, 'utf8')),
].join('\n');

const entries = [
	{ method: 'previewProjectState', key: 'project-state:', commands: ['create-project-state', 'update-project-state'], fields: ['currentFocus', 'storylineCursors'] },
	{ method: 'previewCursorProgression', key: 'cursor:', commands: ['update-storyline-cursor'], fields: ['storyline', 'eventId'] },
	{ method: 'previewEventCreate', key: 'event:create:', commands: ['create-entity'], fields: ['id', 'title', 'data'] },
	{ method: 'previewEventFields', key: 'event:fields:', commands: ['update-entity-fields'], fields: ['storyline', 'storyTime', 'storyTimeEnd', 'timelineOrder', 'prerequisiteEventIds', 'currentPlanIds', 'currentChapterIds', 'characterIds', 'organizationIds', 'locationIds', 'itemIds', 'causes', 'results', 'longTermImpacts', 'evidenceFiles'] },
	{ method: 'previewTimelineImportance', key: 'event:', commands: ['update-timeline-importance'], fields: ['eventId', 'target', 'importance'] },
	{ method: 'previewEventProgression', key: 'event:', commands: ['update-event-status'], fields: ['eventId', 'status'] },
	{ method: 'previewNarrativeProgression', key: 'event:', commands: ['update-narrative-status'], fields: ['eventId', 'status'] },
	{ method: 'previewReaderProgression', key: 'event:', commands: ['update-reader-state'], fields: ['eventId', 'state'] },
	{ method: 'previewMilestoneProgression', key: 'milestone:', commands: ['complete-milestone', 'update-milestone-status'], fields: ['milestoneId', 'status'] },
	{ method: 'previewTaskCreate', key: 'task:create:', commands: ['create-entity'], fields: ['id', 'title', 'data'] },
	{ method: 'previewTaskStatus', key: 'task:status:', commands: ['update-entity-fields'], fields: ['key', 'status'] },
	{ method: 'previewSuggestionDecision', key: 'suggestion:', commands: ['append-suggestion-decision', 'convert-suggestion-to-task'], fields: ['suggestion', 'decision', 'task'] },
	{ method: 'previewForeshadowingUpdate', key: 'foreshadowing:', commands: ['update-entity-fields'], fields: ['truth_event_ids', 'plant_before', 'advance_when', 'reveal_after', 'status'] },
	{ method: 'previewChapterUpdate', key: 'chapter:', commands: ['update-entity-fields'], fields: ['title'] },
	{ method: 'previewContextOutput', key: 'context:', commands: ['regenerate-context'], fields: ['target', 'items', 'policy'] },
] as const;

const preview: ChangePreview = {
	plan: { schemaVersion: CHANGE_PLAN_SCHEMA_VERSION, planId: 'PLAN-1', command: { type: 'update-entity-fields', actor: 'author', requestedAt: '', targetKeys: ['TARGET-1'] }, snapshotVersion: 'S1', risk: 'medium', requiresConfirmation: true, files: [], fieldDiffs: [], relationDiffs: [], warnings: [] },
	impact: { schemaVersion: IMPACT_REPORT_SCHEMA_VERSION, planId: 'PLAN-1', incomingLinks: [], outgoingLinks: [], events: [], tasks: [], foreshadowing: [], characters: [], items: [], knowledgeStates: [], chapters: [], contexts: [], healthItems: [], newNowActions: [], newMissedActions: [], importantChangeSuggested: false, unknownRisks: [] },
};

describe('P0-090B write action reachability matrix', () => {
	it.each(entries)('$method is reachable through keyed preview, confirmation, execute, and cancel', async (entry) => {
		expect(applicationSource).toContain(`async ${entry.method}`);
		expect(viewSource).toContain(entry.method);
		expect(viewSource).toContain(entry.key);
		for (const command of entry.commands) expect(classifyCommandRisk(command).requiresConfirmation).toBe(true);
		for (const field of entry.fields) expect(contractSource).toContain(field);

		const execute = vi.fn().mockResolvedValue({ status: 'succeeded', snapshotVersion: 'S2', audit: {} });
		const runner = new ConsoleActionRunner();
		expect((await runner.run(`${entry.key}TARGET-1`, () => preview, async () => 'TOKEN', execute)).status).toBe('succeeded');
		expect(execute).toHaveBeenCalledWith(preview, 'TOKEN');
		expect((await runner.run(`${entry.key}CANCEL`, () => preview, async () => null, execute)).status).toBe('cancelled');
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('accounts for every dedicated application preview method exactly once', () => {
		const methods = [...applicationSource.matchAll(/\basync (preview[A-Z]\w*)\(/g)].map(match => match[1]).filter(method => method !== 'preview');
		expect([...new Set(entries.map(entry => entry.method))].sort()).toEqual([...new Set(methods)].sort());
	});
});
