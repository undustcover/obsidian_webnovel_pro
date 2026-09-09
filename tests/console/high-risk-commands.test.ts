import { describe, expect, it } from 'vitest';
import { ConsoleCommandRegistry, createChangePlanBase, type ConsoleCommand } from '../../src/console/application';

describe('high-risk Console command boundary', () => {
	it('rejects an unregistered command instead of providing a write bypass', async () => {
		const registry = new ConsoleCommandRegistry();
		const command: ConsoleCommand = { type: 'arbitrary-write', actor: 'author', requestedAt: new Date().toISOString(), targetKeys: [], payload: {} };
		await expect(registry.plan(command, 's1')).rejects.toThrow('Unregistered');
	});

	it('rejects a registered high-risk handler that removes confirmation', async () => {
		const registry = new ConsoleCommandRegistry();
		registry.register('advance-event', async (command, snapshot) => ({ ...createChangePlanBase(command, snapshot), requiresConfirmation: false }));
		const command: ConsoleCommand = { type: 'advance-event', actor: 'author', requestedAt: new Date().toISOString(), targetKeys: ['EVT-1'], payload: {} };
		await expect(registry.plan(command, 's1')).rejects.toThrow('Unsafe plan');
	});
});
