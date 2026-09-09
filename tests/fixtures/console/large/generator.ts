import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface LargeVaultEntry {
	path: string;
	content: string;
}

export const LARGE_VAULT_FILE_COUNT = 10_000;

const pad = (value: number, width = 5): string => String(value).padStart(width, '0');

export function createLargeVaultEntries(count = LARGE_VAULT_FILE_COUNT): LargeVaultEntry[] {
	if (!Number.isInteger(count) || count < 1) throw new RangeError('count must be a positive integer');

	return Array.from({ length: count }, (_, index) => {
		const ordinal = index + 1;
		const selector = index % 50;
		if (selector === 0) {
			return {
				path: `大型样本/总控系统/任务/任务-${pad(ordinal)}.md`,
				content: `---\ntype: task\nid: TSK-${pad(ordinal)}\ntitle: 任务 ${ordinal}\nstatus: planned\nactivation:\n  anchor_type: event\n  anchor_id: EVT-${pad(Math.max(1, ordinal - 1))}\n  relation: approaching\n---\n`,
			};
		}
		if (selector < 5) {
			return {
				path: `大型样本/设定系统/人物/人物-${pad(ordinal)}.md`,
				content: `---\ntype: character\nid: CHR-${pad(ordinal)}\ntitle: 人物 ${ordinal}\naliases: [角色${ordinal}]\ncanon: canon\n---\n`,
			};
		}
		if (selector < 15) {
			return {
				path: `大型样本/事件数据库/事件-${pad(ordinal)}.md`,
				content: `---\ntype: event\nid: EVT-${pad(ordinal)}\ntitle: 事件 ${ordinal}\nevent_status: planned\nstoryline: main\ntimeline_order: ${ordinal}\nprerequisite_events: [EVT-${pad(Math.max(1, ordinal - 1))}]\n---\n`,
			};
		}
		return {
			path: `大型样本/正文/章节-${pad(ordinal)}.md`,
			content: `---\ntype: chapter\nid: CH-${pad(ordinal)}\ntitle: 章节 ${ordinal}\nchapter_no: ${ordinal}\nevents: [EVT-${pad(Math.max(1, ordinal - 1))}]\n---\n\n确定性正文 token-${pad(ordinal)}。\n`,
		};
	});
}

export async function materializeLargeVault(root: string, count = LARGE_VAULT_FILE_COUNT): Promise<void> {
	for (const entry of createLargeVaultEntries(count)) {
		const target = path.join(root, ...entry.path.split('/'));
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, entry.content, 'utf8');
	}
}
