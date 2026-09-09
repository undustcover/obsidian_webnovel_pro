import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultConsoleProject } from '../../src/console/config';
import type { ContextPlan } from '../../src/console/domain';
import { ConfirmationTokenService, ContextOutputRepository, MarkdownChangePlanner, TransactionExecutor, renderContextJson, renderContextMarkdown, validateContextPlan } from '../../src/console/persistence';
import { memoryPlanningPort } from './wave3-fixtures';

const context: ContextPlan = {
	schemaVersion: 'console.context.v1', planId: 'CTX-GOLDEN', target: { kind: 'chapter', key: 'CH-0001' }, generatedAt: '2026-01-01T00:00:00.000Z', snapshotVersion: 'v1',
	policy: { relationDepth: 1, eventPrerequisiteDepth: 2, defaultGovernance: 'canon-active-current' }, conflicts: ['warning'],
	items: [{ key: 'CH-0001', id: 'CH-0001', path: '作品/正文/第一章.md', type: 'chapter', title: '第一章', inclusion: 'auto_included', reasons: ['目标对象'], relationship: 'target', canon: 'canon', lifecycleStatus: 'active', contextScope: 'current', reviewStatus: 'author_confirmed', containsUnrevealed: false, knowledgeBoundary: { reader: 'revealed', pov: {}, allowedReveal: '第一章' }, hasConflict: false, modifiedAt: '2026-01-01T00:00:00.000Z', summary: '摘要' }],
};

describe('ContextOutputRepository', () => {
	it('renders schema-shaped JSON and stable Markdown sections', () => {
		const schema = JSON.parse(readFileSync('doc/console-v0.21/schemas/context-v1.schema.json', 'utf8')) as { properties: Record<string, unknown> };
		const json = JSON.parse(renderContextJson(context)) as Record<string, unknown>;
		expect(Object.keys(json).sort()).toEqual(Object.keys(schema.properties).sort());
		expect((json.target as Record<string, unknown>).title).toBeUndefined();
		expect((json.policy as Record<string, unknown>).allowedReveal).toBeUndefined();
		const markdown = renderContextMarkdown(context);
		expect([...markdown.matchAll(/^## /gm)].map(match => match[0])).toHaveLength(6);
		expect(markdown.indexOf('## 自动纳入')).toBeLessThan(markdown.indexOf('## 手动纳入'));
		expect(validateContextPlan(context)).toEqual([]);
		expect(() => renderContextJson({ ...context, planId: '' })).toThrow('INVALID_CONTEXT_PLAN');
	});

	it('plans the MD+JSON pair with one planId and compensates the first write if the second fails', async () => {
		const mdPath = '作品/Codex上下文/current-context.md';
		const jsonPath = '作品/Codex上下文/current-context.json';
		const oldFiles = { [mdPath]: 'old markdown', [jsonPath]: '{"old":true}' };
		const planning = memoryPlanningPort(oldFiles);
		const files = new Map(Object.entries(oldFiles).map(([path, content]) => [path, { mtime: 1, content }]));
		let writes = 0;
		const port = {
			read: async (path: string) => files.get(path) || null,
			create: vi.fn(),
			modify: vi.fn(async (path: string, content: string) => { writes++; if (writes === 2) throw new Error('second write failed'); files.set(path, { mtime: 1, content }); }),
			delete: vi.fn(async (path: string) => { files.delete(path); }), move: vi.fn(),
		};
		const tokens = new ConfirmationTokenService();
		const executor = new TransactionExecutor(port, { waitForRefresh: vi.fn().mockResolvedValue('v2') }, tokens);
		const repository = new ContextOutputRepository(createDefaultConsoleProject('作品'), planning, new MarkdownChangePlanner(planning), executor);
		const plan = await repository.planOutput(context, '2026-01-01T00:00:00.000Z');
		expect(plan.files).toHaveLength(2);
		expect(plan.files.every(file => file.operation === 'modify')).toBe(true);
		expect(plan.command.type).toBe('regenerate-context');
		const result = await repository.publish(plan, tokens.issue(plan.planId));
		expect(result.status).toBe('failed');
		expect(Object.fromEntries([...files].map(([path, value]) => [path, value.content]))).toEqual(oldFiles);
	});
});
