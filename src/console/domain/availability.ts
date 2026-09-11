export const CONSOLE_AVAILABILITY_STATUSES = [
	'unconfigured', 'initializing', 'ready', 'degraded', 'error',
] as const;

export type ConsoleAvailabilityStatus = typeof CONSOLE_AVAILABILITY_STATUSES[number];

export const CONSOLE_RECOVERY_ACTIONS = ['configure', 'retry', 'rebuild'] as const;
export type ConsoleRecoveryAction = typeof CONSOLE_RECOVERY_ACTIONS[number];

export const CONSOLE_ERROR_CODES = [
	'CONSOLE_PROJECT_UNCONFIGURED',
	'CONSOLE_CONFIG_INVALID',
	'CONSOLE_PROJECT_UNKNOWN',
	'INDEX_INITIALIZING',
	'INDEX_READY',
	'INDEX_SCAN_FAILED',
	'INDEX_CACHE_READ_FAILED',
	'INDEX_CACHE_WRITE_FAILED',
	'INDEX_UNAVAILABLE',
] as const;

export type ConsoleErrorCode = typeof CONSOLE_ERROR_CODES[number];

interface ConsoleAvailabilityBase {
	status: ConsoleAvailabilityStatus;
	code: ConsoleErrorCode;
	projectId?: string;
	message: string;
	retryable: boolean;
	suggestedActions: readonly ConsoleRecoveryAction[];
}

export interface ConsoleUnconfiguredState extends ConsoleAvailabilityBase {
	status: 'unconfigured';
	code: 'CONSOLE_PROJECT_UNCONFIGURED';
	retryable: false;
	suggestedActions: readonly ['configure'];
}

export interface ConsoleInitializingState extends ConsoleAvailabilityBase {
	status: 'initializing';
	code: 'INDEX_INITIALIZING';
	retryable: false;
	processed: number;
	total: number;
}

export interface ConsoleReadyState extends ConsoleAvailabilityBase {
	status: 'ready';
	code: 'INDEX_READY';
	retryable: false;
	snapshotVersion: string;
	recordCount: number;
}

export interface ConsoleDegradedState extends ConsoleAvailabilityBase {
	status: 'degraded';
	code: 'INDEX_SCAN_FAILED' | 'INDEX_CACHE_READ_FAILED' | 'INDEX_CACHE_WRITE_FAILED';
	retryable: true;
	snapshotVersion: string;
	recordCount: number;
	failedPaths: string[];
}

export interface ConsoleErrorState extends ConsoleAvailabilityBase {
	status: 'error';
	code: 'CONSOLE_CONFIG_INVALID' | 'CONSOLE_PROJECT_UNKNOWN' | 'INDEX_SCAN_FAILED' | 'INDEX_UNAVAILABLE';
	technicalDetail?: string;
}

export type ConsoleAvailabilityState =
	| ConsoleUnconfiguredState
	| ConsoleInitializingState
	| ConsoleReadyState
	| ConsoleDegradedState
	| ConsoleErrorState;

export function createUnconfiguredState(): ConsoleUnconfiguredState {
	return {
		status: 'unconfigured',
		code: 'CONSOLE_PROJECT_UNCONFIGURED',
		message: '尚未配置小说控制台项目。',
		retryable: false,
		suggestedActions: ['configure'],
	};
}

export function createReadyState(projectId: string, snapshotVersion: string, recordCount: number): ConsoleReadyState {
	return {
		status: 'ready',
		code: 'INDEX_READY',
		projectId,
		message: `索引已就绪，共 ${recordCount} 条记录。`,
		retryable: false,
		suggestedActions: [],
		snapshotVersion,
		recordCount,
	};
}

export function assertNeverAvailability(value: never): never {
	throw new Error(`Unhandled Console availability state: ${JSON.stringify(value)}`);
}
