import type { EntityRecord } from '../domain';

export interface AdapterHeading {
	heading: string;
	level: number;
}

export interface AdapterSource {
	path: string;
	basename: string;
	mtime: number;
	contentHash: string;
	content: string;
	frontmatter?: Record<string, unknown>;
	headings?: AdapterHeading[];
}

export interface EntityAdapter {
	readonly id: string;
	canParse(source: AdapterSource): boolean;
	parse(source: AdapterSource): EntityRecord[];
}
