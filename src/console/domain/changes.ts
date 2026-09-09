import type { DiagnosticSeverity } from './diagnostics';
import type { AUDIT_SCHEMA_VERSION, CHANGE_PLAN_SCHEMA_VERSION, IMPACT_REPORT_SCHEMA_VERSION } from './schema';

export type RiskLevel = 'low' | 'medium' | 'high';
export type FileOperation = 'create' | 'modify' | 'move' | 'rename' | 'delete';

export interface FileChange {
	path: string;
	operation: FileOperation;
	expectedMtime?: number;
	expectedContentHash?: string;
	targetPath?: string;
	recovery: 'delete_created' | 'restore_original' | 'move_back' | 'manual';
	/** Execution-time content. Audit repositories must always discard this field. */
	content?: string;
}

export interface FieldDiff { path: string; field: string; before: unknown; after: unknown }
export interface RelationDiff { type: string; fromKey: string; toRef: string; operation: 'add' | 'remove' | 'update' }

export interface ChangePlan {
	schemaVersion: typeof CHANGE_PLAN_SCHEMA_VERSION;
	planId: string;
	command: { type: string; actor: 'author'; requestedAt: string; targetKeys: string[] };
	snapshotVersion: string;
	risk: RiskLevel;
	requiresConfirmation: boolean;
	files: FileChange[];
	fieldDiffs: FieldDiff[];
	relationDiffs: RelationDiff[];
	warnings: string[];
}

export interface ImpactReport {
	schemaVersion: typeof IMPACT_REPORT_SCHEMA_VERSION;
	planId: string;
	incomingLinks: string[];
	outgoingLinks: string[];
	events: string[];
	tasks: string[];
	foreshadowing: string[];
	characters: string[];
	items: string[];
	knowledgeStates: string[];
	chapters: string[];
	contexts: string[];
	healthItems: Array<{ ruleId: string; severity: DiagnosticSeverity; entityKey: string }>;
	newNowActions: string[];
	newMissedActions: string[];
	importantChangeSuggested: boolean;
	unknownRisks: string[];
}

export interface AuditRecord {
	schemaVersion: typeof AUDIT_SCHEMA_VERSION;
	auditId: string;
	planId: string;
	commandType: string;
	actor: 'author';
	startedAt: string;
	completedAt?: string;
	targetKeys: string[];
	paths: string[];
	fieldDiffs: FieldDiff[];
	result: 'succeeded' | 'failed' | 'compensated' | 'manual_recovery_required';
	errorCode?: string;
	compensationResult?: string;
	snapshotBefore: string;
	snapshotAfter?: string;
}

export interface ManualRecoveryItem {
	path: string;
	operation: FileOperation;
	reason: string;
	recommendedAction: string;
	/** Runtime-only recovery material; never persisted to console.audit.v1. */
	originalContent?: string;
}
