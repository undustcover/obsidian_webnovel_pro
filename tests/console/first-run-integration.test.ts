import { describe, expect, it, vi } from 'vitest';
import { createDefaultConsoleProject, persistConsoleProjects } from '../../src/console/config';
import { createFirstRunFixtures } from '../fixtures/console/first-run/generator';
import { createFirstRunRuntimeHarness } from '../fixtures/console/first-run/runtimeHarness';

const fixtures = Object.fromEntries(createFirstRunFixtures().map(fixture => [fixture.name, fixture]));

describe('P0-089B first-run integration', () => {
	it.each(createFirstRunFixtures())('maps configuration through initialize: $name', async (fixture) => {
		const { runtime, application } = createFirstRunRuntimeHarness(fixture);
		const before = application.getIndexState();
		expect(before.status).not.toBe('degraded');
		await runtime.initialize();
		const availability = application.getIndexState();
		if (fixture.name === 'empty-config') expect(availability).toMatchObject({ status: 'unconfigured', code: 'CONSOLE_PROJECT_UNCONFIGURED' });
		else if (fixture.name === 'invalid-config') expect(availability).toMatchObject({ status: 'error', code: 'CONSOLE_CONFIG_INVALID', technicalDetail: 'CONFIG_INVALID_PROJECT' });
		else expect(availability).toMatchObject({ status: 'ready', code: 'INDEX_READY', projectId: fixture.expected.projectIds[0] });
	});

	it('persists onboarding configuration, reconfigures the real runtime, and becomes ready without reload', async () => {
		const { runtime, application, plugin } = createFirstRunRuntimeHarness(fixtures['empty-config']!);
		await runtime.initialize();
		expect(application.getIndexState().status).toBe('unconfigured');
		const savedSettings: unknown[] = [];
		const saveSettings = vi.fn(async () => { savedSettings.push(structuredClone(plugin.settings)); });
		const project = { ...createDefaultConsoleProject('新作'), projectId: 'new-project' };

		await persistConsoleProjects(
			plugin.settings as { consoleProjects: (typeof project)[] },
			[project],
			saveSettings,
			projects => application.reconfigureProjects(projects),
		);

		expect(saveSettings).toHaveBeenCalledOnce();
		expect(savedSettings).toEqual([{ consoleProjects: [project], workspaceFolders: [] }]);
		expect(application.getProjectIds()).toEqual(['new-project']);
		expect(application.getIndexState()).toMatchObject({ status: 'ready', recordCount: 0, projectId: 'new-project' });
	});

	it('keeps multi-project data isolated after initialization and switching', async () => {
		const { runtime, application } = createFirstRunRuntimeHarness(fixtures['multi-project']!);
		await runtime.initialize();
		expect(application.search({ page: 1, pageSize: 10 }).items.map(item => item.id)).toEqual(['CHR-0001']);
		expect(application.setActiveProject('beta')).toBe(true);
		expect(application.getIndexState()).toMatchObject({ status: 'ready', projectId: 'beta', recordCount: 1 });
		expect(application.search({ page: 1, pageSize: 10 }).items.map(item => item.id)).toEqual(['EVT-0001']);
	});
});
