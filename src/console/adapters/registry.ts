import type { AdapterSource, EntityAdapter } from './types';
import type { EntityRecord } from '../domain';

export class ConsoleAdapterRegistry {
	constructor(private adapters: readonly EntityAdapter[]) {}

	parse(source: AdapterSource): EntityRecord[] {
		const adapter = this.adapters.find((candidate) => candidate.canParse(source));
		return adapter ? adapter.parse(source) : [];
	}

	matchingAdapter(source: AdapterSource): string | undefined {
		return this.adapters.find((candidate) => candidate.canParse(source))?.id;
	}
}
