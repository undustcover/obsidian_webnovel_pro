import { legacyRecord } from './legacyHelpers';
import type { AdapterSource, EntityAdapter } from './types';

export class LegacyForeshadowingAdapter implements EntityAdapter {
	readonly id = 'legacy-foreshadowing';
	canParse(source: AdapterSource): boolean {
		return /(?:^|\/)(?:伏笔|foreshadowing)\.md$/i.test(source.path) && !source.frontmatter?.type;
	}
	parse(source: AdapterSource) {
		if (!this.canParse(source)) return [];
		return source.content.split(/^---\s*$/m).flatMap((block) => {
			const title = block.match(/^##\s+(.+)$/m)?.[1]?.trim();
			if (!title) return [];
			const quotes = [...block.matchAll(/^>\s*(.+)$/gm)].map((match) => match[1].trim());
			const tags = (block.match(/^\*\*(?:标签|Tags?)\*\*[：:]\s*(.+)$/mi)?.[1] || '').split(/\s+/).map((tag) => tag.replace(/^#/, '')).filter(Boolean);
			const status = block.match(/^\*\*(?:状态|Status)\*\*[：:]\s*(.+)$/mi)?.[1]?.trim();
			const recoveryLogs = [...block.matchAll(/^-\s*\[(阶段|终结|stage|final)\]\s*\[\[([^\]]+)\]\]\s*-\s*([^：:\n]+)[：:]?\s*(.*)$/gmi)].map((match) => ({
				stageType: /终结|final/i.test(match[1]) ? 'final' : 'stage', file: match[2], time: match[3].trim(), note: match[4].trim(),
			}));
			return [legacyRecord(source, 'foreshadowing', title, title, { quotes, tags, status, recoveryLogs, legacyKind: 'foreshadowing' })];
		});
	}
}
