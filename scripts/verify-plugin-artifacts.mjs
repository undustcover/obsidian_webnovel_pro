import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARTIFACT_FILES = ['main.js', 'styles.css', 'manifest.json'];
export const ARTIFACT_EXIT = Object.freeze({ consistent: 0, missing: 2, mismatch: 3 });

const absolute = (path) => isAbsolute(path) ? path : resolve(process.cwd(), path);
const digest = (content) => createHash('sha256').update(content).digest('hex').toUpperCase();

const readArtifact = async (directory, file) => {
	try {
		const content = await readFile(resolve(directory, file));
		return { content, sha256: digest(content) };
	} catch (error) {
		if (error && error.code === 'ENOENT') return undefined;
		throw error;
	}
};

export async function verifyPluginArtifacts(buildDirectory, installedDirectory) {
	const build = absolute(buildDirectory);
	const installed = absolute(installedDirectory);
	const files = {};
	const missing = [];
	const mismatches = [];

	for (const file of ARTIFACT_FILES) {
		const [source, target] = await Promise.all([readArtifact(build, file), readArtifact(installed, file)]);
		if (!source) missing.push(`build:${file}`);
		if (!target) missing.push(`installed:${file}`);
		files[file] = { build: source?.sha256, installed: target?.sha256 };
		if (source && target && source.sha256 !== target.sha256) mismatches.push(file);
	}

	let version;
	if (!missing.length) {
		const sourceManifest = JSON.parse((await readArtifact(build, 'manifest.json')).content.toString('utf8'));
		const targetManifest = JSON.parse((await readArtifact(installed, 'manifest.json')).content.toString('utf8'));
		version = { build: sourceManifest.version, installed: targetManifest.version };
		if (version.build !== version.installed && !mismatches.includes('manifest.json')) mismatches.push('manifest.json');
	}

	const status = missing.length ? 'missing' : mismatches.length ? 'mismatch' : 'consistent';
	return {
		status,
		exitCode: ARTIFACT_EXIT[status],
		buildDirectory: build,
		installedDirectory: installed,
		version,
		files,
		missing,
		mismatches,
	};
}

const parseArguments = (arguments_) => {
	const values = {};
	for (let index = 0; index < arguments_.length; index += 1) {
		const option = arguments_[index];
		if (option !== '--build' && option !== '--installed') throw new Error(`Unknown option: ${option}`);
		const value = arguments_[index + 1];
		if (!value) throw new Error(`Missing value for ${option}`);
		values[option.slice(2)] = value;
		index += 1;
	}
	if (!values.installed) throw new Error('Usage: verify-plugin-artifacts --build <directory> --installed <directory>');
	return { build: values.build ?? process.cwd(), installed: values.installed };
};

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
	try {
		const arguments_ = parseArguments(process.argv.slice(2));
		const report = await verifyPluginArtifacts(arguments_.build, arguments_.installed);
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		process.exitCode = report.exitCode;
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 64;
	}
}
