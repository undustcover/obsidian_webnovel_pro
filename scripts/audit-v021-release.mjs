import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const taskLedgerPath = resolve(repositoryRoot, 'doc/console-v0.21/v0.21_task.md');
const originalTasksPath = resolve(repositoryRoot, 'tasks.md');
const acceptancePath = resolve(repositoryRoot, 'doc/console-v0.21/acceptance-matrix.md');
const closureIndexPath = resolve(repositoryRoot, 'doc/console-v0.21/evidence/closure/README.md');
const allowedStatuses = new Set([' ', '-', 'x', '!', '~']);
const terminalStatuses = new Set(['x', '~']);

const read = path => readFileSync(path, 'utf8');
const failures = [];

function parseTasks(markdown) {
	const matches = [...markdown.matchAll(/^- \[([^\]])\] (P0-\d{3}[A-Z]?) ([^\r\n]+)$/gm)];
	return matches.map((match, index) => ({
		status: match[1],
		id: match[2],
		title: match[3],
		block: markdown.slice(match.index, matches[index + 1]?.index ?? markdown.length),
	}));
}

function assertUnique(tasks, label) {
	const seen = new Set();
	for (const task of tasks) {
		if (!allowedStatuses.has(task.status)) failures.push(`${label}:ILLEGAL_STATUS:${task.id}:${task.status}`);
		if (seen.has(task.id)) failures.push(`${label}:DUPLICATE_TASK:${task.id}`);
		seen.add(task.id);
	}
}

function checkMarkdownLinks(path) {
	const markdown = read(path);
	for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
		const target = match[1].split('#')[0];
		if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
		if (!existsSync(resolve(dirname(path), decodeURIComponent(target)))) failures.push(`BROKEN_LINK:${path}:${target}`);
	}
}

const ledger = read(taskLedgerPath);
const ledgerTasks = parseTasks(ledger);
const originalTasks = parseTasks(read(originalTasksPath));
assertUnique(ledgerTasks, 'LEDGER');
assertUnique(originalTasks, 'ORIGINAL');

for (const task of ledgerTasks.filter(item => Number(item.id.slice(3, 6)) < 94)) {
	if (!terminalStatuses.has(task.status)) failures.push(`NON_TERMINAL_PRE094:${task.id}:${task.status}`);
	const completion = task.block.match(/^  - 完成记录：(.*)$/m)?.[1]?.trim();
	if (!completion) failures.push(`EMPTY_COMPLETION:${task.id}`);
}

for (const id of ['P0-071', 'P0-072', 'P0-073', 'P0-074']) {
	const task = originalTasks.find(item => item.id === id);
	if (!task || !terminalStatuses.has(task.status)) failures.push(`ORIGINAL_PREREQUISITE:${id}:${task?.status ?? 'missing'}`);
}

const acceptanceRows = read(acceptancePath).split(/\r?\n/).filter(line => /^\| AC-\d{2} \|/.test(line));
const acceptanceIds = acceptanceRows.map(line => line.split('|')[1].trim());
const acceptanceStatuses = acceptanceRows.map(line => line.split('|').at(-2)?.trim());
const expectedIds = Array.from({ length: 32 }, (_, index) => `AC-${String(index + 1).padStart(2, '0')}`);
if (acceptanceRows.length !== 32) failures.push(`AC_ROW_COUNT:${acceptanceRows.length}`);
if (acceptanceIds.join(',') !== expectedIds.join(',')) failures.push('AC_ID_SEQUENCE');
for (const row of acceptanceRows) {
	const status = row.split('|').at(-2)?.trim();
	if (!['未开始', '进行中', '通过', '阻塞', '经批准变更'].includes(status)) failures.push(`AC_ILLEGAL_STATUS:${row}`);
}
if (terminalStatuses.has(ledgerTasks.find(item => item.id === 'P0-094B')?.status)) {
	for (const status of ['未开始', '进行中', '阻塞']) {
		if (acceptanceStatuses.includes(status)) failures.push(`AC_NON_TERMINAL_AFTER_094B:${status}`);
	}
}

for (const path of [taskLedgerPath, acceptancePath, closureIndexPath]) checkMarkdownLinks(path);

const report = {
	status: failures.length ? 'failed' : 'passed',
	pre094Tasks: ledgerTasks.filter(item => Number(item.id.slice(3, 6)) < 94).length,
	approvedChanges: ledgerTasks.filter(item => item.status === '~').map(item => item.id),
	originalPrerequisites: ['P0-071', 'P0-072', 'P0-073', 'P0-074'],
	acceptanceRows: acceptanceRows.length,
	acceptanceByStatus: Object.fromEntries([...new Set(acceptanceStatuses)].map(status => [status, acceptanceStatuses.filter(value => value === status).length])),
	failures,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
