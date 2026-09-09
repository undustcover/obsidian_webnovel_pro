import { describe, expect, it } from 'vitest';
import { createLargeVaultEntries, LARGE_VAULT_FILE_COUNT } from '../fixtures/console/large/generator';

describe('console Vault fixtures', () => {
	it('generates exactly 10k deterministic, unique large-Vault files', () => {
		const first = createLargeVaultEntries();
		const second = createLargeVaultEntries();

		expect(first).toHaveLength(LARGE_VAULT_FILE_COUNT);
		expect(new Set(first.map((entry) => entry.path))).toHaveLength(LARGE_VAULT_FILE_COUNT);
		expect(second).toEqual(first);
		expect(first[0]?.content).toContain('type: task');
		expect(first.at(-1)?.content).toContain('type: chapter');
	});

	it('rejects invalid requested sizes', () => {
		expect(() => createLargeVaultEntries(0)).toThrow(RangeError);
		expect(() => createLargeVaultEntries(1.5)).toThrow(RangeError);
	});
});
