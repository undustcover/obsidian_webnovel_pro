import { describe, expect, it } from 'vitest';
import {
	CANON_STATUSES,
	GOVERNANCE_DISPLAY_DEFAULTS,
	createLegacyKey,
	createSuggestionId,
	hasValidIdShape,
	normalizeEnum,
} from '../../src/console/domain';

describe('console domain v1', () => {
	it('uses frozen governance display defaults for missing fields', () => {
		expect(GOVERNANCE_DISPLAY_DEFAULTS).toEqual({
			canon: 'canon',
			lifecycleStatus: 'active',
			contextScope: 'current',
			reviewStatus: 'pending_review',
		});
		expect(normalizeEnum(undefined, CANON_STATUSES, 'canon')).toEqual({ value: 'canon', isMissing: true });
		expect(normalizeEnum(null, CANON_STATUSES, 'canon')).toEqual({ value: 'canon', isMissing: true });
		expect(normalizeEnum('', CANON_STATUSES, 'canon')).toEqual({ value: 'canon', isMissing: true });
		expect(normalizeEnum('candidate', CANON_STATUSES, 'canon')).toEqual({ value: 'candidate', isMissing: false });
	});

	it('preserves an explicit unknown enum instead of silently defaulting it', () => {
		expect(normalizeEnum('experimental', CANON_STATUSES, 'canon')).toEqual({
			value: 'unknown', raw: 'experimental', isMissing: false,
		});
	});

	it('creates normalized legacy keys that cannot be confused with formal IDs', () => {
		expect(createLegacyKey('作品\\设定\\人物.md', '林澈')).toBe('legacy:作品/设定/人物.md#林澈');
		expect(createLegacyKey('/作品/正文.md', '')).toBe('legacy:作品/正文.md#file');
	});

	it('validates normal and compound ID shapes by entity type', () => {
		expect(hasValidIdShape('character', 'CHR-0001')).toBe(true);
		expect(hasValidIdShape('character', 'EVT-0001')).toBe(false);
		expect(hasValidIdShape('chapter_revision', 'REV-CH-0012-01')).toBe(true);
		expect(hasValidIdShape('chapter_revision', 'REV-CH-12-1')).toBe(false);
		expect(hasValidIdShape('project_state', 'PROJECT-0001')).toBe(false);
	});

	it('creates stable suggestion identities', () => {
		expect(createSuggestionId({ ruleId: 'PROG_TASK_ANCHOR_PASSED', targetKey: 'TSK-0001', anchorId: 'EVT-0009' }))
			.toBe('SUG:PROG_TASK_ANCHOR_PASSED:TSK-0001:EVT-0009');
		expect(createSuggestionId({ ruleId: 'STRUCT_ID_MISSING', targetKey: 'legacy:path#file' }))
			.toBe('SUG:STRUCT_ID_MISSING:legacy:path#file:none');
	});
});
