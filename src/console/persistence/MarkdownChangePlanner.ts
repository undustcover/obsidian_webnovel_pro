import type { ChangePlan, FieldDiff, FileChange, FileOperation, RelationDiff } from '../domain';
import { createChangePlanBase, contentHash, type ConsoleCommand } from '../application/commands';

export interface MarkdownFileState {
	mtime: number;
	content: string;
}

export interface MarkdownPlanningPort {
	read(path: string): Promise<MarkdownFileState | null>;
}

export interface MarkdownMutation {
	path: string;
	operation: FileOperation;
	targetPath?: string;
	content?: string;
}

export interface MarkdownCommandPayload {
	mutations: MarkdownMutation[];
	fieldDiffs?: FieldDiff[];
	relationDiffs?: RelationDiff[];
	warnings?: string[];
}

function normalizeVaultPath(path: string): string {
	const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
	if (!normalized || normalized === '.' || normalized.split('/').includes('..')) throw new Error(`Invalid Vault path: ${path}`);
	return normalized;
}

function recoveryFor(operation: FileOperation): FileChange['recovery'] {
	if (operation === 'create') return 'delete_created';
	if (operation === 'move' || operation === 'rename') return 'move_back';
	return 'restore_original';
}

function frontmatterFields(content: string | undefined): Map<string, string> {
	const result = new Map<string, string>();
	if (!content?.startsWith('---')) return result;
	const lines = content.replace(/\r\n/g, '\n').split('\n');
	const end = lines.indexOf('---', 1);
	if (end < 0) return result;
	let key: string | undefined;
	let value: string[] = [];
	const flush = () => { if (key) result.set(key, value.join('\n').trim()); };
	for (const line of lines.slice(1, end)) {
		const match = line.match(/^([A-Za-z_\u3400-\u9fff][\w\-\u3400-\u9fff]*):(?:\s*(.*))?$/u);
		if (match) { flush(); key = match[1]; value = [match[2] || '']; }
		else if (key) value.push(line);
	}
	flush();
	return result;
}

function deriveFieldDiffs(path: string, before: string | undefined, after: string | undefined): FieldDiff[] {
	const left = frontmatterFields(before);
	const right = frontmatterFields(after);
	return [...new Set([...left.keys(), ...right.keys()])].sort().flatMap(field => {
		const beforeValue = left.get(field);
		const afterValue = right.get(field);
		return beforeValue === afterValue ? [] : [{ path, field, before: beforeValue, after: afterValue }];
	});
}

export class MarkdownChangePlanner {
	constructor(private readonly port: MarkdownPlanningPort) {}

	async plan(command: ConsoleCommand<MarkdownCommandPayload>, snapshotVersion: string): Promise<ChangePlan> {
		const payload = command.payload;
		if (!Array.isArray(payload.mutations) || payload.mutations.length === 0) throw new Error('Command has no Markdown mutations');
		const paths = new Set<string>();
		const files: FileChange[] = [];
		const derivedFieldDiffs: FieldDiff[] = [];
		for (const mutation of [...payload.mutations].sort((left, right) => left.path.localeCompare(right.path))) {
			const path = normalizeVaultPath(mutation.path);
			if (paths.has(path)) throw new Error(`Duplicate mutation path: ${path}`);
			paths.add(path);
			const targetPath = mutation.targetPath ? normalizeVaultPath(mutation.targetPath) : undefined;
			if ((mutation.operation === 'move' || mutation.operation === 'rename') && !targetPath) throw new Error(`${mutation.operation} requires targetPath`);
			if ((mutation.operation === 'create' || mutation.operation === 'modify') && mutation.content === undefined) throw new Error(`${mutation.operation} requires content`);
			const current = await this.port.read(path);
			if (mutation.operation === 'create' && current) throw new Error(`Create target already exists: ${path}`);
			if (mutation.operation !== 'create' && !current) throw new Error(`Source does not exist: ${path}`);
			if (targetPath && await this.port.read(targetPath)) throw new Error(`Target already exists: ${targetPath}`);
			files.push({
				path, operation: mutation.operation, targetPath, content: mutation.content,
				expectedMtime: current?.mtime,
				expectedContentHash: current ? contentHash(current.content) : undefined,
				recovery: recoveryFor(mutation.operation),
			});
			if (mutation.operation === 'create') derivedFieldDiffs.push(...deriveFieldDiffs(path, undefined, mutation.content));
			else if (mutation.operation === 'modify') derivedFieldDiffs.push(...deriveFieldDiffs(path, current?.content, mutation.content));
			else if (mutation.operation === 'delete') derivedFieldDiffs.push(...deriveFieldDiffs(path, current?.content, undefined));
		}
		const supplied = payload.fieldDiffs || [];
		const suppliedKeys = new Set(supplied.map(diff => `${diff.path}\0${diff.field}`));
		const fieldDiffs = [...supplied, ...derivedFieldDiffs.filter(diff => !suppliedKeys.has(`${diff.path}\0${diff.field}`))];
		const plan = createChangePlanBase(command, snapshotVersion, fieldDiffs, payload.relationDiffs || []);
		plan.files = files;
		plan.warnings = [...(payload.warnings || [])];
		return plan;
	}
}
