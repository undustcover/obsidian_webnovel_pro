import type { EntityRecord } from '../domain';
import { INDEX_SCHEMA_VERSION } from '../domain';
import { IndexSnapshot } from './IndexSnapshot';

export interface IndexCachePort {
	read(): Promise<string | null>;
	write(content: string): Promise<void>;
	remove(): Promise<void>;
}

interface SerializedIndexCache {
	schemaVersion: typeof INDEX_SCHEMA_VERSION;
	projectId: string;
	snapshotVersion: string;
	records: EntityRecord[];
}

const withoutFullBody = (record: EntityRecord): EntityRecord => {
	const data = { ...record.data };
	delete data.body;
	delete data.content;
	delete data['正文'];
	return { ...record, data };
};

export class IndexCache {
	constructor(private port: IndexCachePort) {}

	async load(): Promise<IndexSnapshot | null> {
		try {
			const content = await this.port.read();
			if (!content) return null;
			const parsed = JSON.parse(content) as Partial<SerializedIndexCache>;
			if (parsed.schemaVersion !== INDEX_SCHEMA_VERSION || typeof parsed.projectId !== 'string' || typeof parsed.snapshotVersion !== 'string' || !Array.isArray(parsed.records)) return null;
			return new IndexSnapshot(parsed.snapshotVersion, parsed.projectId, parsed.records);
		} catch { return null; }
	}

	async save(snapshot: IndexSnapshot): Promise<void> {
		const payload: SerializedIndexCache = {
			schemaVersion: INDEX_SCHEMA_VERSION,
			projectId: snapshot.projectId,
			snapshotVersion: snapshot.version,
			records: snapshot.records.map(withoutFullBody),
		};
		await this.port.write(JSON.stringify(payload));
	}

	async clear(): Promise<void> { await this.port.remove(); }
}
