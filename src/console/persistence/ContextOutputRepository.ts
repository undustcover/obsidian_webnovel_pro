import { CONTEXT_SCHEMA_VERSION, type ChangePlan, type ContextItem, type ContextPlan } from '../domain';
import type { ConsoleProjectConfig } from '../config';
import type { TransactionResult } from './TransactionExecutor';
import type { MarkdownChangePlanner, MarkdownPlanningPort } from './MarkdownChangePlanner';
import type { TransactionExecutor } from './TransactionExecutor';

const join = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
const escapeMd = (value: string) => value.replace(/\r?\n/g, ' ').trim();

function renderItem(item: ContextItem): string {
	return `- \`${item.id || item.key}\` · \`${item.path}${item.anchor ? `#${item.anchor}` : ''}\` · ${item.type} · ${escapeMd(item.title)}\n  - 原因：${item.reasons.map(escapeMd).join('；')}\n  - 关系：${escapeMd(item.relationship)}\n  - 权威/生命周期/范围/复核：${item.canon} / ${item.lifecycleStatus} / ${item.contextScope} / ${item.reviewStatus}\n  - 知识边界：reader=${escapeMd(item.knowledgeBoundary.reader)}；allowed=${escapeMd(item.knowledgeBoundary.allowedReveal)}\n  - 摘要：${escapeMd(item.summary) || '（空）'}`;
}

export function validateContextPlan(plan: ContextPlan): string[] {
	const errors: string[] = [];
	if (plan.schemaVersion !== CONTEXT_SCHEMA_VERSION) errors.push('schemaVersion');
	if (!plan.planId || !plan.target?.key || !plan.snapshotVersion) errors.push('identity');
	if (!Array.isArray(plan.items) || !Array.isArray(plan.conflicts)) errors.push('collections');
	for (const item of plan.items || []) if (!item.key || !item.path || !item.reasons.length || !item.knowledgeBoundary) errors.push(`item:${item.key || 'unknown'}`);
	return errors;
}

export function renderContextJson(plan: ContextPlan): string {
	const errors = validateContextPlan(plan);
	if (errors.length) throw new Error(`INVALID_CONTEXT_PLAN:${errors.join(',')}`);
	return `${JSON.stringify(plan, null, 2)}\n`;
}

export function renderContextMarkdown(plan: ContextPlan): string {
	const errors = validateContextPlan(plan);
	if (errors.length) throw new Error(`INVALID_CONTEXT_PLAN:${errors.join(',')}`);
	const groups = (inclusion: ContextItem['inclusion']) => plan.items.filter(item => item.inclusion === inclusion).map(renderItem).join('\n') || '- 无';
	const conflicts = plan.conflicts.map(item => `- ${escapeMd(item)}`).join('\n') || '- 无';
	const allowedReveal = plan.items.find(item => item.knowledgeBoundary.allowedReveal)?.knowledgeBoundary.allowedReveal || '未指定';
	return `---\nschema_version: ${CONTEXT_SCHEMA_VERSION}\nplan_id: ${JSON.stringify(plan.planId)}\ngenerated_at: ${JSON.stringify(plan.generatedAt)}\nsnapshot_version: ${JSON.stringify(plan.snapshotVersion)}\ntarget_kind: ${plan.target.kind}\ntarget_key: ${JSON.stringify(plan.target.key)}\n---\n\n# Codex 上下文\n\n## 目标\n\n\`${plan.target.key}\`\n\n## 策略与知识边界\n\n- 关系深度：${plan.policy.relationDepth}\n- 事件前置深度：${plan.policy.eventPrerequisiteDepth}\n- 默认治理过滤：canon + active + current\n- 本次允许揭示：${escapeMd(allowedReveal)}\n\n## 自动纳入\n\n${groups('auto_included')}\n\n## 手动纳入\n\n${groups('manual_included')}\n\n## 手动排除\n\n${groups('manual_excluded')}\n\n## 冲突与警告\n\n${conflicts}\n`;
}

export class ContextOutputRepository {
	readonly markdownPath: string;
	readonly jsonPath: string;
	constructor(project: ConsoleProjectConfig, private readonly port: MarkdownPlanningPort, private readonly planner: MarkdownChangePlanner, private readonly executor: TransactionExecutor) {
		const root = join(project.root, project.directories.context);
		this.markdownPath = join(root, 'current-context.md'); this.jsonPath = join(root, 'current-context.json');
	}
	async planOutput(context: ContextPlan, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const markdownCurrent = await this.port.read(this.markdownPath);
		const jsonCurrent = await this.port.read(this.jsonPath);
		return this.planner.plan({
			type: 'regenerate-context', actor: 'author', requestedAt, targetKeys: [context.target.key],
			payload: { mutations: [
				{ path: this.markdownPath, operation: markdownCurrent ? 'modify' : 'create', content: renderContextMarkdown(context) },
				{ path: this.jsonPath, operation: jsonCurrent ? 'modify' : 'create', content: renderContextJson(context) },
			] },
		}, context.snapshotVersion);
	}
	async publish(plan: ChangePlan, confirmationToken: string): Promise<TransactionResult> { return this.executor.execute(plan, confirmationToken); }
}
