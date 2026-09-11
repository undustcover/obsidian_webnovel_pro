import { createChangePlanBase, type ConsoleCommand } from './commands';
import type { ChangePlan, CreativeTaskData } from '../domain';
import type { CreativeTaskRepository, SuggestionDecisionEntry, SuggestionDecisionRepository } from '../persistence';

export class SuggestionCommandService {
	constructor(private decisions: SuggestionDecisionRepository, private tasks: CreativeTaskRepository) {}
	planDecision(entry: SuggestionDecisionEntry, snapshotVersion: string): Promise<ChangePlan> { if (entry.decision === 'converted_to_task') throw new Error('USE_PLAN_CONVERT'); return this.decisions.planAppend(entry, snapshotVersion); }
	async planConvert(entry: SuggestionDecisionEntry, task: { id: string; title: string; data: CreativeTaskData }, snapshotVersion: string): Promise<ChangePlan> {
		if (entry.decision !== 'converted_to_task' || entry.resultingTaskId !== task.id) throw new Error('INVALID_SUGGESTION_CONVERSION');
		const taskPlan = await this.tasks.planCreate(task.id, task.title, task.data, entry.decidedAt); const decisionPlan = await this.decisions.planAppend(entry, snapshotVersion);
		const command: ConsoleCommand = { type: 'convert-suggestion-to-task', actor: 'author', requestedAt: entry.decidedAt, targetKeys: [entry.targetKey, task.id], payload: {} };
		const plan = createChangePlanBase(command, snapshotVersion, [...taskPlan.fieldDiffs, ...decisionPlan.fieldDiffs], [...taskPlan.relationDiffs, ...decisionPlan.relationDiffs]); plan.files = [...taskPlan.files, ...decisionPlan.files].sort((a, b) => a.path.localeCompare(b.path)); plan.warnings = [...taskPlan.warnings, ...decisionPlan.warnings]; return plan;
	}
}
