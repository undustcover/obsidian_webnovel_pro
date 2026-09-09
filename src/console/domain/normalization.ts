export interface NormalizedEnum<T extends string> {
	value: T | 'unknown';
	raw?: unknown;
	isMissing: boolean;
}

export function normalizeEnum<T extends string>(raw: unknown, allowed: readonly T[], missingDefault: T): NormalizedEnum<T> {
	if (raw === undefined || raw === null || raw === '') {
		return { value: missingDefault, isMissing: true };
	}
	if (typeof raw === 'string' && allowed.includes(raw as T)) {
		return { value: raw as T, isMissing: false };
	}
	return { value: 'unknown', raw, isMissing: false };
}
