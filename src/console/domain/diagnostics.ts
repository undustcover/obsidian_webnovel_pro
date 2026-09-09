export type DiagnosticSeverity = 'error' | 'warning' | 'suggestion' | 'author_confirmation';

export interface DiagnosticEvidence {
	path: string;
	anchor?: string;
	field?: string;
	value?: unknown;
}

export interface DiagnosticRef {
	ruleId: string;
	severity: DiagnosticSeverity;
	entityKey: string;
	message: string;
	evidence: DiagnosticEvidence[];
	suggestion?: string;
	autoFixKind?: 'rebuild_cache' | 'delete_derived_cache' | 'regenerate_context' | 'remove_stale_generated_entry';
}
