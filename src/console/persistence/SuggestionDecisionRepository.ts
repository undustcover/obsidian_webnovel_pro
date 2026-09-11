import type { ChangePlan, SuggestionDecision } from '../domain';
import type { ConsoleProjectConfig } from '../config';
import type { MarkdownChangePlanner, MarkdownPlanningPort } from './MarkdownChangePlanner';

export interface SuggestionDecisionEntry { suggestionId: string; ruleId: string; targetKey: string; decision: SuggestionDecision; decidedAt: string; snoozeUntilAnchor?: string; resultingTaskId?: string; rationale?: string }
const decisionsFrom = (content: string): SuggestionDecisionEntry[] => { const match = content.match(/^decisions:\s*(\[.*\])\s*$/m); if (!match) return []; try { const parsed: unknown = JSON.parse(match[1]); return Array.isArray(parsed) ? parsed as SuggestionDecisionEntry[] : []; } catch { return []; } };
const render = (decisions: SuggestionDecisionEntry[]) => `---\ntype: suggestion_decision_log\nschema_version: 1\ndecisions: ${JSON.stringify(decisions)}\n---\n\n# 建议决策\n`;
const join = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');

export class SuggestionDecisionRepository {
	readonly path: string;
	constructor(project: ConsoleProjectConfig, private port: MarkdownPlanningPort, private planner: MarkdownChangePlanner) { this.path = join(project.root, project.directories.control, '建议决策.md'); }
	async read(): Promise<SuggestionDecisionEntry[]> { const file = await this.port.read(this.path); return file ? decisionsFrom(file.content) : []; }
	async latest(): Promise<Map<string, SuggestionDecisionEntry>> { const result = new Map<string, SuggestionDecisionEntry>(); for (const entry of await this.read()) if (entry.suggestionId && entry.decision) result.set(entry.suggestionId, entry); return result; }
	async planAppend(entry: SuggestionDecisionEntry, snapshotVersion: string): Promise<ChangePlan> {
		if (!['handled', 'converted_to_task', 'snoozed', 'ignored_once', 'not_applicable'].includes(entry.decision)) throw new Error('INVALID_SUGGESTION_DECISION');
		if (entry.decision === 'converted_to_task' && !/^TSK-\d{4,}$/.test(entry.resultingTaskId || '')) throw new Error('RESULTING_TASK_REQUIRED');
		const current = await this.port.read(this.path); const content = render([...(current ? decisionsFrom(current.content) : []), entry]);
		return this.planner.plan({ type: entry.decision === 'converted_to_task' ? 'convert-suggestion-to-task' : 'append-suggestion-decision', actor: 'author', requestedAt: entry.decidedAt, targetKeys: [entry.targetKey], payload: { mutations: [{ path: this.path, operation: current ? 'modify' : 'create', content }] } }, snapshotVersion);
	}
}
export { decisionsFrom as parseSuggestionDecisions };
