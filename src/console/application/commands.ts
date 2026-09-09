import {
	CHANGE_PLAN_SCHEMA_VERSION,
	IMPACT_REPORT_SCHEMA_VERSION,
	type ChangePlan,
	type FieldDiff,
	type ImpactReport,
	type RelationDiff,
	type RiskLevel,
} from '../domain';

export interface ConsoleCommand<TPayload = Record<string, unknown>> {
	type: string;
	actor: 'author';
	requestedAt: string;
	targetKeys: string[];
	payload: TPayload;
}

export interface CommandRiskPolicy {
	risk: RiskLevel;
	requiresConfirmation: boolean;
}

const HIGH_RISK_COMMANDS = new Set([
	'assign-permanent-id', 'bulk-assign-permanent-ids', 'change-canon-status',
	'change-lifecycle-status', 'publish-chapter', 'unpublish-chapter',
	'advance-event', 'update-event-status', 'update-reader-state',
	'update-narrative-status', 'update-storyline-cursor', 'complete-milestone',
	'update-milestone-status', 'bulk-update-relations', 'move-entity',
	'rename-entity', 'delete-entity', 'convert-suggestion-to-task',
]);

const MEDIUM_RISK_COMMANDS = new Set([
	'create-entity', 'update-entity-fields', 'update-timeline-importance',
	'create-project-state', 'update-project-state', 'append-suggestion-decision',
	'regenerate-context',
]);

export function classifyCommandRisk(type: string): CommandRiskPolicy {
	if (HIGH_RISK_COMMANDS.has(type)) return { risk: 'high', requiresConfirmation: true };
	if (MEDIUM_RISK_COMMANDS.has(type)) return { risk: 'medium', requiresConfirmation: true };
	// An unregistered write must fail closed instead of becoming a low-risk bypass.
	return { risk: 'high', requiresConfirmation: true };
}

export function stableSerialize(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

export function contentHash(content: string): string {
	let hash = 0x811c9dc5;
	for (let index = 0; index < content.length; index++) {
		hash ^= content.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createPlanId(command: ConsoleCommand<unknown>, snapshotVersion: string): string {
	const input = stableSerialize({ command, snapshotVersion });
	return `PLAN-${contentHash(input).slice('fnv1a32:'.length).toUpperCase()}`;
}

export function createEmptyImpactReport(planId: string): ImpactReport {
	return {
		schemaVersion: IMPACT_REPORT_SCHEMA_VERSION,
		planId,
		incomingLinks: [], outgoingLinks: [], events: [], tasks: [], foreshadowing: [],
		characters: [], items: [], knowledgeStates: [], chapters: [], contexts: [],
		healthItems: [], newNowActions: [], newMissedActions: [],
		importantChangeSuggested: false, unknownRisks: [],
	};
}

export function createChangePlanBase(
	command: ConsoleCommand<unknown>,
	snapshotVersion: string,
	fieldDiffs: FieldDiff[] = [],
	relationDiffs: RelationDiff[] = [],
): ChangePlan {
	const policy = classifyCommandRisk(command.type);
	return {
		schemaVersion: CHANGE_PLAN_SCHEMA_VERSION,
		planId: createPlanId(command, snapshotVersion),
		command: {
			type: command.type,
			actor: command.actor,
			requestedAt: command.requestedAt,
			targetKeys: [...command.targetKeys].sort(),
		},
		snapshotVersion,
		risk: policy.risk,
		requiresConfirmation: policy.requiresConfirmation,
		files: [], fieldDiffs, relationDiffs, warnings: [],
	};
}

export class ConsoleCommandRegistry {
	private readonly handlers = new Map<string, (command: ConsoleCommand, snapshotVersion: string) => Promise<ChangePlan>>();

	register(type: string, handler: (command: ConsoleCommand, snapshotVersion: string) => Promise<ChangePlan>): void {
		if (this.handlers.has(type)) throw new Error(`Command already registered: ${type}`);
		this.handlers.set(type, handler);
	}

	async plan(command: ConsoleCommand, snapshotVersion: string): Promise<ChangePlan> {
		const handler = this.handlers.get(command.type);
		if (!handler) throw new Error(`Unregistered Console command: ${command.type}`);
		const plan = await handler(command, snapshotVersion);
		const required = classifyCommandRisk(command.type);
		if (required.requiresConfirmation && !plan.requiresConfirmation) {
			throw new Error(`Unsafe plan rejected for command: ${command.type}`);
		}
		return plan;
	}
}
