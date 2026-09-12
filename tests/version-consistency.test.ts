import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageMetadata {
	version: string;
	author: string;
	license: string;
}

interface ManifestMetadata {
	id: string;
	version: string;
	minAppVersion: string;
	author: string;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T;

describe('release version consistency', () => {
	it('keeps package, manifest, compatibility mapping, and documented feature mapping aligned', () => {
		const packageMetadata = readJson<PackageMetadata>('package.json');
		const manifest = readJson<ManifestMetadata>('manifest.json');
		const versions = readJson<Record<string, string>>('versions.json');
		const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

		expect(manifest.id).toBe('web-novel-assistant');
		expect(packageMetadata.version).toBe(manifest.version);
		expect(versions[manifest.version]).toBe(manifest.minAppVersion);
		expect(manifest.version).toBe('0.3.0');
		expect(packageMetadata.author).toBe('undustcover');
		expect(manifest.author).toBe('undustcover');
		expect(packageMetadata.license).toBe('MIT');
		expect(readme).toContain('v0.3 是当前公开版本，插件清单版本为 0.3.0（Git 标签 v0.3）');
		expect(readme).toContain('v0.3 is the current public release; its plugin manifest version is 0.3.0 (Git tag v0.3)');
	});
});
