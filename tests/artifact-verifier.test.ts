import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];
const script = resolve(process.cwd(), 'scripts/verify-plugin-artifacts.mjs');
const files = {
	'main.js': 'module.exports = {};\n',
	'styles.css': '.plugin { display: block; }\n',
	'manifest.json': '{"id":"web-novel-assistant","version":"0.22.0"}\n',
};

const fixture = () => {
	const root = mkdtempSync(join(tmpdir(), 'webnovel-artifacts-'));
	temporaryDirectories.push(root);
	const build = join(root, 'build');
	const installed = join(root, 'installed');
	mkdirSync(build);
	mkdirSync(installed);
	for (const [name, content] of Object.entries(files)) {
		writeFileSync(join(build, name), content);
		writeFileSync(join(installed, name), content);
	}
	return { build, installed };
};

const run = (build: string, installed: string) =>
	spawnSync(process.execPath, [script, '--build', build, '--installed', installed], { encoding: 'utf8' });

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('plugin artifact verifier CLI', () => {
	it('returns 0 when version, required files, and hashes match', () => {
		const { build, installed } = fixture();
		const result = run(build, installed);
		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout)).toMatchObject({ status: 'consistent', missing: [], mismatches: [] });
	});

	it('returns 2 when a required file is missing', () => {
		const { build, installed } = fixture();
		rmSync(join(installed, 'styles.css'));
		const result = run(build, installed);
		expect(result.status).toBe(2);
		expect(JSON.parse(result.stdout)).toMatchObject({ status: 'missing', missing: ['installed:styles.css'] });
	});

	it('returns 3 when an installed artifact hash differs', () => {
		const { build, installed } = fixture();
		writeFileSync(join(installed, 'main.js'), 'module.exports = { stale: true };\n');
		const result = run(build, installed);
		expect(result.status).toBe(3);
		expect(JSON.parse(result.stdout)).toMatchObject({ status: 'mismatch', mismatches: ['main.js'] });
	});
});
