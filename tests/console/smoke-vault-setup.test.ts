import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { prepareConsoleSmokeVaults, SMOKE_VAULT_NAMES, validateConsoleSmokeVaults } from '../../scripts/prepare-console-smoke-vaults';
import { parseProjectState } from '../../src/console/persistence/ProjectStateRepository';

const temporaryRoots: string[] = [];
afterAll(() => {
	for (const path of temporaryRoots) {
		if (!resolve(path).startsWith(resolve(tmpdir()))) throw new Error(`Refusing to remove non-temporary path: ${path}`);
		rmSync(path, { recursive: true, force: true });
	}
});

describe('P0-091A real smoke Vault preparation', () => {
	it('keeps the minimal project-state fixture aligned with the scalar focus contract', () => {
		const content = readFileSync('tests/fixtures/console/minimal/雾港纪事/总控系统/当前阶段.md', 'utf8');
		expect(parseProjectState(content)).toEqual({ schemaVersion: 1, currentFocus: 'CH-0001', storylineCursors: { protagonist: 'EVT-0001' } });
	});

	it('prepares four isolated Vaults with identical candidate artifacts and deterministic checks', () => {
		const target = mkdtempSync(join(tmpdir(), 'console-smoke-')); temporaryRoots.push(target);
		const manifest = prepareConsoleSmokeVaults(target);
		expect(manifest.vaults.map(vault => vault.name)).toEqual(SMOKE_VAULT_NAMES);
		expect(manifest.vaults.map(vault => vault.markdownCount)).toEqual([0, 3, 9, 8]);
		expect(new Set(manifest.vaults.map(vault => JSON.stringify(vault.artifactHashes)))).toHaveLength(1);
		expect(validateConsoleSmokeVaults(manifest)).toEqual([]);
		expect(JSON.parse(readFileSync(join(target, 'smoke-manifest.json'), 'utf8'))).toMatchObject({ version: 1, pluginId: 'web-novel-assistant' });
	}, 15_000);

	it('detects artifact drift and refuses a non-empty target', () => {
		const target = mkdtempSync(join(tmpdir(), 'console-smoke-')); temporaryRoots.push(target);
		const manifest = prepareConsoleSmokeVaults(target);
		writeFileSync(join(manifest.vaults[1]!.path, '.obsidian', 'plugins', manifest.pluginId, 'main.js'), 'drift', 'utf8');
		expect(validateConsoleSmokeVaults(manifest)).toContain('ARTIFACT_HASH_MISMATCH:legacy-workspace:main.js');
		expect(() => prepareConsoleSmokeVaults(target)).toThrow('must be absent or empty');
	}, 15_000);
});
