import { describe, expect, it } from 'vitest';
import { CONSOLE_BUILD_INFO, formatBuildInfo, normalizeBuildInfo } from '../../src/console/buildInfo';

describe('Console build identity', () => {
	it('provides stable development fallbacks when build injection is unavailable', () => {
		expect(CONSOLE_BUILD_INFO).toEqual({
			version: '0.3.0',
			commit: 'development',
			builtAt: 'development',
		});
	});

	it('normalizes missing or blank fields without exposing machine details', () => {
		expect(normalizeBuildInfo({ version: ' ', commit: '', builtAt: '\t' })).toEqual({
			version: '0.3.0',
			commit: 'development',
			builtAt: 'development',
		});
		expect(formatBuildInfo({ version: '0.22.0', commit: 'abc123', builtAt: '2026-09-10T00:00:00.000Z' }))
			.toBe('插件 0.22.0 · commit abc123 · 构建时间 2026-09-10T00:00:00.000Z');
	});
});
