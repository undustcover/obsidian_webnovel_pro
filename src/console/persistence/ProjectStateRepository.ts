import type { ChangePlan } from '../domain';
import type { ConsoleProjectConfig } from '../config';
import type { MarkdownPlanningPort } from './MarkdownChangePlanner';
import type { MarkdownChangePlanner } from './MarkdownChangePlanner';

export interface ProjectState {
	schemaVersion: 1;
	currentFocus: string | null;
	storylineCursors: Record<string, string>;
}

export interface ProjectStateUpdate { currentFocus: string | null; storylineCursors: Record<string, string> }

const join = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
const unquote = (value: string): string => {
	const trimmed = value.trim();
	return trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) ? trimmed.slice(1, -1) : trimmed;
};

function parseProjectState(content: string): ProjectState {
	const lines = content.replace(/\r\n/g, '\n').split('\n');
	const schema = lines.find(line => /^schema_version:/.test(line))?.split(':').slice(1).join(':').trim();
	const focusLines = lines.filter(line => /^current_focus:/.test(line));
	const focus = focusLines[0]?.split(':').slice(1).join(':').trim();
	if (schema !== '1' || focusLines.length !== 1 || focus === undefined || (!focus && focus !== 'null')) throw new Error('INVALID_PROJECT_STATE');
	const storylineCursors: Record<string, string> = {};
	const start = lines.findIndex(line => /^storyline_cursors:\s*$/.test(line));
	if (start >= 0) for (const line of lines.slice(start + 1)) {
		if (/^\S/.test(line)) break;
		const match = line.match(/^\s{2,}([^:]+):\s*(.+)$/);
		if (match) storylineCursors[unquote(match[1])] = unquote(match[2]);
	}
	return { schemaVersion: 1, currentFocus: focus === 'null' ? null : unquote(focus), storylineCursors };
}

function validateUpdate(update: ProjectStateUpdate): void {
	if (update.currentFocus !== null && !/^[A-Z]+(?:-[A-Z]+)*-\d{4,}(?:-\d{2,})?$/.test(update.currentFocus)) throw new Error('INVALID_CURRENT_FOCUS');
	for (const [storyline, eventId] of Object.entries(update.storylineCursors)) {
		if (!storyline.trim() || !/^EVT-\d{4,}$/.test(eventId)) throw new Error('INVALID_STORYLINE_CURSOR');
	}
}

function renderProjectState(update: ProjectStateUpdate): string {
	const cursors = Object.entries(update.storylineCursors).sort(([a], [b]) => a.localeCompare(b)).map(([storyline, eventId]) => `  ${JSON.stringify(storyline)}: ${eventId}`).join('\n');
	return `---\ntype: project_state\nschema_version: 1\ncurrent_focus: ${update.currentFocus ?? 'null'}\nstoryline_cursors:\n${cursors}\n---\n\n# 当前阶段\n`;
}

export class ProjectStateRepository {
	readonly path: string;
	constructor(private readonly project: ConsoleProjectConfig, private readonly port: MarkdownPlanningPort, private readonly planner: MarkdownChangePlanner) {
		this.path = join(project.root, project.directories.control, '当前阶段.md');
	}

	async read(): Promise<ProjectState | null> {
		const file = await this.port.read(this.path);
		return file ? parseProjectState(file.content) : null;
	}

	async planCreate(update: ProjectStateUpdate, snapshotVersion: string, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		if (await this.port.read(this.path)) throw new Error('PROJECT_STATE_ALREADY_EXISTS');
		return this.plan('create-project-state', 'create', update, snapshotVersion, requestedAt);
	}

	async planUpdate(update: ProjectStateUpdate, snapshotVersion: string, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const current = await this.read();
		if (!current) throw new Error('PROJECT_STATE_NOT_CONFIGURED');
		return this.plan('update-project-state', 'modify', update, snapshotVersion, requestedAt, [current.currentFocus, update.currentFocus].filter((value): value is string => Boolean(value)));
	}

	async planCursorUpdate(storyline: string, eventId: string, snapshotVersion: string, requestedAt = new Date().toISOString()): Promise<ChangePlan> {
		const current = await this.read();
		if (!current) throw new Error('PROJECT_STATE_NOT_CONFIGURED');
		return this.plan('update-storyline-cursor', 'modify', {
			currentFocus: current.currentFocus,
			storylineCursors: { ...current.storylineCursors, [storyline]: eventId },
		}, snapshotVersion, requestedAt);
	}

	private async plan(type: string, operation: 'create' | 'modify', update: ProjectStateUpdate, snapshotVersion: string, requestedAt: string, targetKeys = update.currentFocus ? [update.currentFocus] : []): Promise<ChangePlan> {
		validateUpdate(update);
		return this.planner.plan({ type, actor: 'author', requestedAt, targetKeys: [...new Set(targetKeys)], payload: { mutations: [{ path: this.path, operation, content: renderProjectState(update) }] } }, snapshotVersion);
	}
}

export { parseProjectState, renderProjectState };
