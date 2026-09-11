import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));

const readGitIdentity = () => {
	try {
		const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
			cwd: new URL('..', import.meta.url),
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
		const dirty = execFileSync('git', ['status', '--porcelain'], {
			cwd: new URL('..', import.meta.url),
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim().length > 0;
		return dirty ? `${commit}-dirty` : commit;
	} catch {
		return 'unknown';
	}
};

const readBuildTime = () => {
	const epoch = process.env.SOURCE_DATE_EPOCH;
	if (epoch && /^\d+$/.test(epoch)) return new Date(Number(epoch) * 1000).toISOString();
	return new Date().toISOString();
};

const identity = {
	version: String(manifest.version),
	commit: readGitIdentity(),
	builtAt: readBuildTime(),
};

await Promise.all([
	build({
		entryPoints: ['main.ts'],
		bundle: true,
		format: 'cjs',
		external: ['obsidian', '@codemirror/*'],
		minify: true,
		outfile: 'main.js',
		define: {
			__WEBNOVEL_BUILD_VERSION__: JSON.stringify(identity.version),
			__WEBNOVEL_BUILD_COMMIT__: JSON.stringify(identity.commit),
			__WEBNOVEL_BUILD_TIME__: JSON.stringify(identity.builtAt),
		},
	}),
	build({
		entryPoints: ['src/styles/index.css'],
		bundle: true,
		outfile: 'styles.css',
	}),
]);

process.stdout.write(`WebNovel Assistant ${identity.version} (${identity.commit}, ${identity.builtAt})\n`);
