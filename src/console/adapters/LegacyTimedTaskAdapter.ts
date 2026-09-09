import { legacyRecord } from './legacyHelpers';
import type { AdapterSource, EntityAdapter } from './types';

const LABELS: Readonly<Record<string, string>> = Object.freeze({
	'平台': 'platform', Platform: 'platform', '任务': 'position', Position: 'position',
	'任务类型': 'taskType', Type: 'taskType', '目标字数': 'wordTarget', 'Word Target': 'wordTarget',
	'开始日期': 'startDate', 'Start Date': 'startDate', '结束日期': 'endDate', 'End Date': 'endDate',
	'起始字数': 'startSnapshot', 'Start Snapshot': 'startSnapshot', '完成字数': 'completedWords', 'Completed Words': 'completedWords',
	'状态': 'status', Status: 'status',
});

export class LegacyTimedTaskAdapter implements EntityAdapter {
	readonly id = 'legacy-timed-task';
	canParse(source: AdapterSource): boolean {
		return /(?:^|\/)(?:限时任务|tasks?)\.md$/i.test(source.path) && !source.frontmatter?.type;
	}
	parse(source: AdapterSource) {
		if (!this.canParse(source)) return [];
		return source.content.split(/^---\s*$/m).flatMap((block) => {
			const match = block.match(/^##\s+(?:第(\d+)期|Period\s+(\d+))/mi);
			if (!match) return [];
			const period = Number(match[1] || match[2]);
			const data: Record<string, unknown> = { period, legacyKind: 'timed-task' };
			for (const meta of block.matchAll(/^\*\*(.+?)\*\*[：:]\s*(.+)$/gm)) data[LABELS[meta[1]] || meta[1]] = meta[2].trim();
			return [legacyRecord(source, 'task', `Period ${period}`, String(period), data)];
		});
	}
}
