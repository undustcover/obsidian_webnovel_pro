import type { AdapterSource, ConsoleAdapterRegistry } from '../adapters';

export interface ClassifiedSource {
	source: AdapterSource;
	adapterId: string;
}

export class SourceClassifier {
	constructor(private registry: ConsoleAdapterRegistry) {}

	classify(source: AdapterSource): ClassifiedSource | undefined {
		const adapterId = this.registry.matchingAdapter(source);
		return adapterId ? { source, adapterId } : undefined;
	}
}
