import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { createDefaultConsoleProject } from '../src/console/config';

const ARTIFACTS = ['main.js', 'styles.css', 'manifest.json'] as const;
export const SMOKE_VAULT_NAMES = ['fresh', 'legacy-workspace', 'minimal', 'mixed-legacy'] as const;
export type SmokeVaultName = typeof SMOKE_VAULT_NAMES[number];

export interface SmokeVaultManifestEntry {
	name: SmokeVaultName;
	path: string;
	projectRoot: string;
	markdownCount: number;
	keyPaths: string[];
	artifactHashes: Record<(typeof ARTIFACTS)[number], string>;
}

export interface SmokeVaultManifest {
	version: 1;
	pluginId: string;
	createdAt: string;
	vaults: SmokeVaultManifestEntry[];
}

const sha256 = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');
const filesUnder = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
	const path = join(directory, entry.name);
	return entry.isDirectory() ? filesUnder(path) : [path];
});

function ensureNewTarget(target: string): void {
	if (existsSync(target) && (!statSync(target).isDirectory() || readdirSync(target).length > 0)) throw new Error(`Smoke target must be absent or empty: ${target}`);
	mkdirSync(target, { recursive: true });
}

function installPlugin(repositoryRoot: string, vaultPath: string, pluginId: string): Record<(typeof ARTIFACTS)[number], string> {
	const pluginDirectory = join(vaultPath, '.obsidian', 'plugins', pluginId);
	mkdirSync(pluginDirectory, { recursive: true });
	const hashes = {} as Record<(typeof ARTIFACTS)[number], string>;
	for (const artifact of ARTIFACTS) {
		const source = join(repositoryRoot, artifact);
		if (!existsSync(source)) throw new Error(`Missing candidate artifact: ${source}`);
		const destination = join(pluginDirectory, artifact);
		copyFileSync(source, destination);
		hashes[artifact] = sha256(destination);
	}
	writeFileSync(join(vaultPath, '.obsidian', 'community-plugins.json'), `${JSON.stringify([pluginId], null, 2)}\n`, 'utf8');
	return hashes;
}

function configurePlugin(vaultPath: string, pluginId: string, value: unknown): void {
	writeFileSync(join(vaultPath, '.obsidian', 'plugins', pluginId, 'data.json'), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function prepareConsoleSmokeVaults(targetDirectory: string, repositoryRoot = resolve('.')): SmokeVaultManifest {
	const target = resolve(targetDirectory);
	ensureNewTarget(target);
	const manifest = JSON.parse(readFileSync(join(repositoryRoot, 'manifest.json'), 'utf8')) as { id: string };
	const definitions: Array<{ name: SmokeVaultName; root: string; fixture?: string; settings?: unknown }> = [
		{ name: 'fresh', root: '新作' },
		{ name: 'legacy-workspace', root: '旧作', fixture: 'legacy-workspace', settings: { consoleProjects: [], workspaceFolders: ['旧作'], loreFolderName: '设定' } },
		{ name: 'minimal', root: '雾港纪事', fixture: 'minimal', settings: { consoleProjects: [createDefaultConsoleProject('雾港纪事')], workspaceFolders: [] } },
		{ name: 'mixed-legacy', root: '混合样本', fixture: 'mixed-legacy', settings: { consoleProjects: [createDefaultConsoleProject('混合样本')], workspaceFolders: [] } },
	];
	const vaults = definitions.map(definition => {
		const vaultPath = join(target, definition.name);
		mkdirSync(vaultPath, { recursive: true });
		if (definition.fixture) cpSync(join(repositoryRoot, 'tests', 'fixtures', 'console', definition.fixture, definition.root), join(vaultPath, definition.root), { recursive: true });
		else mkdirSync(join(vaultPath, definition.root), { recursive: true });
		const artifactHashes = installPlugin(repositoryRoot, vaultPath, manifest.id);
		if (definition.settings) configurePlugin(vaultPath, manifest.id, definition.settings);
		const markdown = filesUnder(vaultPath).filter(path => path.endsWith('.md'));
		return {
			name: definition.name,
			path: vaultPath,
			projectRoot: definition.root,
			markdownCount: markdown.length,
			keyPaths: [join(definition.root, ...(definition.name === 'fresh' ? [] : definition.name === 'legacy-workspace' ? ['正文', '第一章.md'] : definition.name === 'minimal' ? ['总控系统', '当前阶段.md'] : ['时间线.md']))],
			artifactHashes,
		};
	});
	const result: SmokeVaultManifest = { version: 1, pluginId: manifest.id, createdAt: new Date().toISOString(), vaults };
	writeFileSync(join(target, 'smoke-manifest.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
	return result;
}

export function validateConsoleSmokeVaults(manifest: SmokeVaultManifest): string[] {
	const errors: string[] = [];
	if (manifest.vaults.map(item => item.name).join(',') !== SMOKE_VAULT_NAMES.join(',')) errors.push('VAULT_MATRIX_INCOMPLETE');
	const reference = manifest.vaults[0]?.artifactHashes;
	for (const vault of manifest.vaults) {
		for (const keyPath of vault.keyPaths) if (!existsSync(join(vault.path, keyPath))) errors.push(`KEY_PATH_MISSING:${vault.name}:${keyPath}`);
		for (const artifact of ARTIFACTS) {
			const path = join(vault.path, '.obsidian', 'plugins', manifest.pluginId, artifact);
			if (!existsSync(path)) errors.push(`ARTIFACT_MISSING:${vault.name}:${artifact}`);
			else if (sha256(path) !== vault.artifactHashes[artifact]) errors.push(`ARTIFACT_HASH_MISMATCH:${vault.name}:${artifact}`);
			else if (reference && vault.artifactHashes[artifact] !== reference[artifact]) errors.push(`ARTIFACT_NOT_IDENTICAL:${vault.name}:${artifact}`);
		}
		const markdownCount = filesUnder(vault.path).filter(path => path.endsWith('.md')).length;
		if (markdownCount !== vault.markdownCount) errors.push(`MARKDOWN_COUNT_MISMATCH:${vault.name}`);
	}
	return errors;
}

if (process.argv[1] && basename(process.argv[1]) === 'prepare-console-smoke-vaults.ts') {
	const target = process.argv[2];
	if (!target) throw new Error('Usage: tsx scripts/prepare-console-smoke-vaults.ts <empty-target-directory>');
	const result = prepareConsoleSmokeVaults(target);
	const errors = validateConsoleSmokeVaults(result);
	if (errors.length) throw new Error(errors.join('\n'));
	console.log(`Prepared ${result.vaults.length} Console smoke Vaults in ${resolve(target)}.`);
}

