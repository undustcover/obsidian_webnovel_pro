import manifest from '../../manifest.json';

declare const __WEBNOVEL_BUILD_VERSION__: string;
declare const __WEBNOVEL_BUILD_COMMIT__: string;
declare const __WEBNOVEL_BUILD_TIME__: string;

export interface ConsoleBuildInfo {
	version: string;
	commit: string;
	builtAt: string;
}

const nonEmpty = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

export function normalizeBuildInfo(input: Partial<ConsoleBuildInfo> = {}): ConsoleBuildInfo {
	return {
		version: nonEmpty(input.version) ?? manifest.version,
		commit: nonEmpty(input.commit) ?? 'development',
		builtAt: nonEmpty(input.builtAt) ?? 'development',
	};
}

export const CONSOLE_BUILD_INFO = normalizeBuildInfo({
	version: typeof __WEBNOVEL_BUILD_VERSION__ === 'undefined' ? undefined : __WEBNOVEL_BUILD_VERSION__,
	commit: typeof __WEBNOVEL_BUILD_COMMIT__ === 'undefined' ? undefined : __WEBNOVEL_BUILD_COMMIT__,
	builtAt: typeof __WEBNOVEL_BUILD_TIME__ === 'undefined' ? undefined : __WEBNOVEL_BUILD_TIME__,
});

export function formatBuildInfo(info: ConsoleBuildInfo = CONSOLE_BUILD_INFO): string {
	return `插件 ${info.version} · commit ${info.commit} · 构建时间 ${info.builtAt}`;
}
