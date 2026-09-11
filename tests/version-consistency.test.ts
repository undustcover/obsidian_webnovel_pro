import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageMetadata {
	version: string;
}

interface ManifestMetadata {
	id: string;
	version: string;
	minAppVersion: string;
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
		expect(readme).toContain('V0.21 是小说控制台功能规格版本，对应插件发布版本 0.21.9（Git 标签 V0.219）');
		expect(readme).toContain('V0.21 is the Novel Console feature-spec version and maps to plugin release 0.21.9 (Git tag V0.219)');
	});
});
