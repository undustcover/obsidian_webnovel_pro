import { legacyRecord } from './legacyHelpers';
import type { AdapterSource, EntityAdapter } from './types';

export class LegacyTimelineAdapter implements EntityAdapter {
	readonly id = 'legacy-timeline';
	canParse(source: AdapterSource): boolean {
		return /(?:^|\/)(?:时间线|timeline)\.md$/i.test(source.path) && !source.frontmatter?.type;
	}
	parse(source: AdapterSource) {
		if (!this.canParse(source)) return [];
		const blocks = source.content.split(/^---\s*$/m);
		const records = [];
		for (const block of blocks) {
			const heading = block.match(/^##\s+(.+)$/m)?.[1]?.trim();
			if (!heading) continue;
			const type = block.match(/^\*\*(?:Type|类型)\*\*[：:]\s*(.+)$/mi)?.[1]?.trim();
			const bulletMatches = [...block.matchAll(/^-\s+(.+?)(?=\n-\s+|$)/gms)];
			if (bulletMatches.length === 0) {
				const description = block.replace(/^##.*$/m, '').replace(/^\*\*(?:Type|类型).*$/gmi, '').trim().replace(/\n\s*\n/g, '\n');
				records.push(legacyRecord(source, 'event', heading, heading, { time: heading, type, description, legacyKind: 'timeline' }));
				continue;
			}
			bulletMatches.forEach((match, index) => {
				const raw = match[1].trim();
				const chapters = [...raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((item) => item[1]);
				const origin = raw.match(/<!--\s*origin:\s*(.*?)\s*-->/i)?.[1];
				const description = raw.replace(/\s*\[\[[^\]]+\]\]/g, '').replace(/<!--.*?-->/gs, '').replace(/^\s+/gm, '').trim();
				records.push(legacyRecord(source, 'event', description.split('\n')[0] || heading, `${heading}:${index + 1}`, { time: heading, type, description, chapters, origin, legacyKind: 'timeline' }));
			});
		}
		return records;
	}
}
