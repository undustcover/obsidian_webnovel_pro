import { legacyRecord } from './legacyHelpers';
import { FieldResolver, toStringArray } from './fieldResolver';
import type { AdapterSource, EntityAdapter } from './types';

export class LegacyChapterAdapter implements EntityAdapter {
	readonly id = 'legacy-chapter';
	canParse(source: AdapterSource): boolean {
		if (!source.frontmatter) return /(?:第\s*[零一二三四五六七八九十百千万\d]+\s*章|chapter\s*\d+)/i.test(source.basename);
		if (typeof source.frontmatter.type === 'string' || typeof source.frontmatter.id === 'string') return false;
		return ['synopsis', 'Synopsis', '摘要', 'timeline', 'Status', '状态'].some((key) => Object.prototype.hasOwnProperty.call(source.frontmatter, key)) || /第.+章|chapter\s*\d+/i.test(source.basename);
	}
	parse(source: AdapterSource) {
		if (!this.canParse(source)) return [];
		const fm = source.frontmatter || {};
		const resolver = new FieldResolver();
		const title = resolver.resolve(fm, 'title').value;
		const record = legacyRecord(source, 'chapter', typeof title === 'string' ? title : source.basename, undefined, {
			synopsis: resolver.resolve(fm, 'synopsis').value,
			status: resolver.resolve(fm, 'status').value,
			timeline: fm.timeline,
		});
		record.aliases = toStringArray(resolver.resolve(fm, 'aliases').value);
		return [record];
	}
}
