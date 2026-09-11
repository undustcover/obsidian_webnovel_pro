import { describe, expect, it } from 'vitest';
import { createFirstRunFixtures } from '../fixtures/console/first-run/generator';
import { createFirstRunRuntimeHarness } from '../fixtures/console/first-run/runtimeHarness';

describe('P0-089A first-run fixtures', () => {
	it('generates the complete matrix deterministically without derived cache entries', () => {
		const first = createFirstRunFixtures();
		const second = createFirstRunFixtures();
		expect(second).toEqual(first);
		expect(first.map(fixture => fixture.name)).toEqual([
			'empty-config', 'legacy-workspace', 'invalid-config', 'multi-project', 'zero-file',
		]);
		expect(first.flatMap(fixture => fixture.files).every(file => file.path.endsWith('.md'))).toBe(true);
		expect(first.flatMap(fixture => fixture.files).some(file => file.path.includes('console-index-v1-'))).toBe(false);
		first[0]!.settings.consoleProjects = [{ projectId: 'mutation' }];
		expect(createFirstRunFixtures()[0]?.settings.consoleProjects).toEqual([]);
	});

	it.each(createFirstRunFixtures())('is consumable by runtime: $name', async (fixture) => {
		const { runtime } = createFirstRunRuntimeHarness(fixture);
		expect(runtime.getProjectIds()).toEqual(fixture.expected.projectIds);
		expect(runtime.getConfigDiagnostics().map(item => item.code)).toEqual(fixture.expected.diagnosticCodes);
		await runtime.initialize();
		for (const [projectId, count] of Object.entries(fixture.expected.recordCounts)) {
			expect(runtime.getIndex(projectId)?.getSnapshot()?.records).toHaveLength(count);
		}
		runtime.destroy();
	});
});
