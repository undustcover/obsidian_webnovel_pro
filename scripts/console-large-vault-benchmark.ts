import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { ConsoleAdapterRegistry } from '../src/console/adapters/registry';
import { PropertiesEntityAdapter } from '../src/console/adapters/PropertiesEntityAdapter';
import type { AdapterSource } from '../src/console/adapters/types';
import { EntityIndexService } from '../src/console/indexing/EntityIndexService';
import { IndexCoordinator } from '../src/console/indexing/IndexCoordinator';
import { EntityQuery } from '../src/console/application/EntityQuery';
import { createDefaultConsoleProject } from '../src/console/config/projectConfig';
import { createLargeVaultEntries, LARGE_VAULT_FILE_COUNT, materializeLargeVault } from '../tests/fixtures/console/large/generator';

const percentile = (samples: readonly number[], value: number): number => {
	const sorted = [...samples].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] || 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

function parseScalar(value: string): unknown {
	const clean = value.trim();
	if (clean.startsWith('[') && clean.endsWith(']')) {
		return clean.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean);
	}
	if (/^-?\d+(?:\.\d+)?$/.test(clean)) return Number(clean);
	return clean.replace(/^["']|["']$/g, '');
}

function toSource(entry: { path: string; content: string }): AdapterSource {
	const frontmatter: Record<string, unknown> = {};
	const yaml = /^---\n([\s\S]*?)\n---/.exec(entry.content)?.[1] || '';
	for (const line of yaml.split('\n')) {
		const match = /^(\w[\w-]*):\s*(.*)$/.exec(line);
		if (match) frontmatter[match[1]] = parseScalar(match[2]);
	}
	return {
		path: entry.path,
		basename: entry.path.split('/').at(-1)?.replace(/\.md$/, '') || '',
		mtime: 1,
		contentHash: `benchmark:${entry.path}`,
		content: entry.content,
		frontmatter,
	};
}

async function readMaterializedSources(root: string, entries: readonly { path: string }[]): Promise<AdapterSource[]> {
	const result: AdapterSource[] = [];
	for (let offset = 0; offset < entries.length; offset += 100) {
		const batch = entries.slice(offset, offset + 100);
		result.push(...await Promise.all(batch.map(async entry => toSource({
			path: entry.path,
			content: await readFile(path.join(root, ...entry.path.split('/')), 'utf8'),
		}))));
	}
	return result;
}

async function main(): Promise<void> {
	const entries = createLargeVaultEntries();
	const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'webnovel-console-benchmark-'));
	const materializeStarted = performance.now();
	await materializeLargeVault(fixtureRoot);
	const materializeMs = performance.now() - materializeStarted;
	let sources: AdapterSource[] = [];
	try {
		const project = createDefaultConsoleProject('大型样本');
		const registry = new ConsoleAdapterRegistry([new PropertiesEntityAdapter()]);
		let yieldCount = 0;
		const yieldLatencies: number[] = [];
		const service = new EntityIndexService(
		{ listMarkdownFiles: async () => {
			sources = await readMaterializedSources(fixtureRoot, entries);
			return sources;
		} }, registry, undefined,
		async () => {
			const started = performance.now();
			await new Promise<void>(resolve => setImmediate(resolve));
			yieldLatencies.push(performance.now() - started);
			yieldCount++;
		},
		);
		const memoryBefore = process.memoryUsage().heapUsed;
		const initialStarted = performance.now();
		const snapshot = await service.build(project);
		const initialMs = performance.now() - initialStarted;
		const memoryAfter = process.memoryUsage().heapUsed;

		const query = new EntityQuery(() => service.getSnapshot());
		const searchSamples: number[] = [];
		for (let index = 0; index < 100; index++) {
		const target = sources[(index * 97) % LARGE_VAULT_FILE_COUNT];
		const targetId = target.frontmatter?.id;
		if (typeof targetId !== 'string') throw new Error('Benchmark fixture entry is missing an ID');
		const started = performance.now();
		const result = query.execute({ query: targetId, pageSize: 20 });
		if (result.total < 1) throw new Error('Benchmark search failed to find its deterministic token');
		searchSamples.push(performance.now() - started);
		}

		const coordinator = new IndexCoordinator(service);
		const incrementalSamples: number[] = [];
		for (let index = 0; index < 30; index++) {
		const source = sources[15 + index * 50];
		const changed = { ...source, mtime: index + 2, contentHash: `${source.contentHash}:${index}`, frontmatter: { ...source.frontmatter, title: `增量修改 ${index}` } };
		const started = performance.now();
		coordinator.apply(project, { type: 'modify', source: changed });
		query.execute({ query: `增量修改 ${index}`, pageSize: 5 });
		incrementalSamples.push(performance.now() - started);
		}

		const report = {
		schemaVersion: 'console.benchmark.v1',
		generatedAt: new Date().toISOString(),
		device: { platform: `${os.platform()} ${os.release()}`, arch: os.arch(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGb: round(os.totalmem() / 1024 ** 3), node: process.version },
		fixture: { files: sources.length, expectedFiles: LARGE_VAULT_FILE_COUNT, indexedRecords: snapshot.records.length, materializeMs: round(materializeMs), batchSize: project.performance.batchSize, yieldCount },
		metricsMs: {
			initialIndex: round(initialMs),
			incrementalP50: round(percentile(incrementalSamples, 0.5)),
			incrementalP95: round(percentile(incrementalSamples, 0.95)),
			searchP50: round(percentile(searchSamples, 0.5)),
			searchP95: round(percentile(searchSamples, 0.95)),
			yieldLatencyP95: round(percentile(yieldLatencies, 0.95)),
		},
		memory: { heapDeltaMb: round((memoryAfter - memoryBefore) / 1024 ** 2), heapAfterMb: round(memoryAfter / 1024 ** 2) },
		thresholdsMs: { initialIndex: 30_000, incrementalP95: 500, searchP95: 100 },
		passed: initialMs <= 30_000 && percentile(incrementalSamples, 0.95) <= 500 && percentile(searchSamples, 0.95) <= 100 && yieldCount === Math.floor(sources.length / project.performance.batchSize),
		};
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		if (!report.passed) process.exitCode = 1;
	} finally {
		await rm(fixtureRoot, { recursive: true, force: true });
	}
}

void main();
