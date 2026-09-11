import { describe, expect, it } from 'vitest';
import {
	CONSOLE_AVAILABILITY_STATUSES,
	CONSOLE_ERROR_CODES,
	CONSOLE_RECOVERY_ACTIONS,
	createReadyState,
	createUnconfiguredState,
	type ConsoleAvailabilityState,
} from '../../src/console/domain';

const summarize = (state: ConsoleAvailabilityState): string => {
	switch (state.status) {
		case 'unconfigured': return state.suggestedActions[0];
		case 'initializing': return `${state.processed}/${state.total}`;
		case 'ready': return `${state.recordCount}`;
		case 'degraded': return `${state.failedPaths.length}`;
		case 'error': return state.code;
	}
};

describe('Console availability state contract', () => {
	it('defines exactly the five required statuses and stable recovery vocabulary', () => {
		expect(CONSOLE_AVAILABILITY_STATUSES).toEqual(['unconfigured', 'initializing', 'ready', 'degraded', 'error']);
		expect(CONSOLE_RECOVERY_ACTIONS).toEqual(['configure', 'retry', 'rebuild']);
		expect(new Set(CONSOLE_ERROR_CODES).size).toBe(CONSOLE_ERROR_CODES.length);
	});

	it('serializes each discriminated state without losing fields', () => {
		const states: ConsoleAvailabilityState[] = [
			createUnconfiguredState(),
			{ status: 'initializing', code: 'INDEX_INITIALIZING', projectId: 'p1', message: '索引中', retryable: false, suggestedActions: [], processed: 2, total: 5 },
			createReadyState('p1', 's1', 0),
			{ status: 'degraded', code: 'INDEX_SCAN_FAILED', projectId: 'p1', message: '部分失败', retryable: true, suggestedActions: ['retry', 'rebuild'], snapshotVersion: 's1', recordCount: 3, failedPaths: ['bad.md'] },
			{ status: 'error', code: 'INDEX_UNAVAILABLE', projectId: 'p1', message: '索引不可用', technicalDetail: 'disk error', retryable: true, suggestedActions: ['retry'] },
		];

		for (const state of states) {
			expect(JSON.parse(JSON.stringify(state))).toEqual(state);
			expect(summarize(state)).toBeTruthy();
		}
	});

	it('treats no project as actionable unconfigured and a zero-record snapshot as ready', () => {
		expect(createUnconfiguredState()).toMatchObject({ status: 'unconfigured', retryable: false, suggestedActions: ['configure'] });
		expect(createReadyState('empty-project', 'snapshot-1', 0)).toMatchObject({ status: 'ready', recordCount: 0 });
	});
});
