import type { DiagnosticRef } from '../domain';

export const BUILTIN_FIELD_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
	type: ['type', '对象类型', '类型'], id: ['id', 'ID', '永久ID', '永久_id'],
	title: ['title', 'name', '标题', '名称'], aliases: ['aliases', 'alias', '别名', 'Alias'],
	canon: ['canon', '权威状态', '正式状态'], lifecycle_status: ['lifecycle_status', 'lifecycle', '生命周期'],
	context_scope: ['context_scope', '上下文范围'], review_status: ['review_status', '审核状态', '复核状态'],
	related_files: ['related_files', '相关文件', '补充材料'], last_reviewed: ['last_reviewed', '最后检查', '最近复核'],
	synopsis: ['synopsis', 'Synopsis', '摘要'], status: ['status', 'Status', '状态'],
});

export interface ResolvedField {
	value: unknown;
	key?: string;
	present: Array<{ key: string; value: unknown }>;
	conflict: boolean;
}

const equalValue = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export class FieldResolver {
	constructor(private projectAliases: Readonly<Record<string, readonly string[]>> = {}) {}

	resolve(frontmatter: Record<string, unknown>, canonical: string): ResolvedField {
		const keys = [...new Set([canonical, ...(this.projectAliases[canonical] || []), ...(BUILTIN_FIELD_ALIASES[canonical] || [])])];
		const present = keys.filter((key) => Object.prototype.hasOwnProperty.call(frontmatter, key)).map((key) => ({ key, value: frontmatter[key] }));
		const selected = present[0];
		return { value: selected?.value, key: selected?.key, present, conflict: present.some((item) => !equalValue(item.value, selected?.value)) };
	}

	conflictDiagnostic(entityKey: string, path: string, field: string, resolved: ResolvedField): DiagnosticRef | null {
		if (!resolved.conflict) return null;
		return {
			ruleId: 'STRUCT_FIELD_ALIAS_CONFLICT', severity: 'warning', entityKey,
			message: `Conflicting aliases for ${field}.`,
			evidence: resolved.present.map((item) => ({ path, field: item.key, value: item.value })),
		};
	}
}

export const toStringArray = (value: unknown): string[] => {
	if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
	if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
	return [];
};
