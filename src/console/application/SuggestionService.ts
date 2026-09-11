import { createSuggestionId, type DiagnosticRef } from '../domain';
import type { SuggestionDecisionEntry } from '../persistence';

export interface Suggestion { id: string; ruleId: string; targetKey: string; anchorId?: string; message: string }
export class SuggestionService {
	derive(diagnostics: readonly DiagnosticRef[], decisions: ReadonlyMap<string, SuggestionDecisionEntry> = new Map()): Suggestion[] {
		const unique = new Map<string, Suggestion>();
		for (const diagnostic of diagnostics.filter(item => item.severity === 'suggestion' || item.ruleId.startsWith('PROG_'))) {
			const anchorId = diagnostic.evidence.map(item => item.value).find(value => typeof value === 'string' && /^(EVT|MLS)-/.test(value)) as string | undefined;
			const id = createSuggestionId({ ruleId: diagnostic.ruleId, targetKey: diagnostic.entityKey, anchorId }); const decision = decisions.get(id);
			if (decision && ['handled', 'not_applicable', 'converted_to_task'].includes(decision.decision)) continue;
			unique.set(id, { id, ruleId: diagnostic.ruleId, targetKey: diagnostic.entityKey, anchorId, message: diagnostic.message });
		}
		return [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
	}
}
