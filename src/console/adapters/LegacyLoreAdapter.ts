import { legacyRecord } from './legacyHelpers';
import type { AdapterSource, EntityAdapter } from './types';

const aliasesAfterHeading = (content: string, heading: string): string[] => {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const section = content.match(new RegExp(`^##\\s+${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'mi'))?.[1] || '';
	const value = section.match(/^\*\*(?:Alias|Aliases|别名)\*\*[：:]\s*(.+)$/mi)?.[1];
	return value ? value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) : [];
};

export class LegacyLoreAdapter implements EntityAdapter {
	readonly id = 'legacy-lore';
	canParse(source: AdapterSource): boolean {
		return !source.frontmatter?.type && !source.frontmatter?.id && (source.headings?.some((heading) => heading.level === 2) || /(^|\/)设定(?:系统)?\//.test(source.path));
	}
	parse(source: AdapterSource) {
		if (!this.canParse(source)) return [];
		const headings = source.headings?.filter((heading) => heading.level === 2).map((heading) => heading.heading) || [...source.content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
		if (headings.length === 0) return [legacyRecord(source, 'character', source.basename, undefined, { legacyKind: 'lore-file' })];
		return headings.map((heading) => {
			const record = legacyRecord(source, 'character', heading, heading, { legacyKind: 'lore-h2' });
			record.aliases = aliasesAfterHeading(source.content, heading);
			return record;
		});
	}
}
