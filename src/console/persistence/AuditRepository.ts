import { AUDIT_SCHEMA_VERSION, type AuditRecord } from '../domain';

export interface AuditStoragePort {
	read(): Promise<string | null>;
	write(content: string): Promise<void>;
}

interface AuditDocument { schemaVersion: typeof AUDIT_SCHEMA_VERSION; records: AuditRecord[] }

function sanitize(record: AuditRecord): AuditRecord {
	const sanitized: unknown = JSON.parse(JSON.stringify(record, (key: string, value: unknown): unknown =>
		['content', 'originalContent', 'body', 'markdown'].includes(key) ? undefined : value
	));
	return sanitized as AuditRecord;
}

export class AuditRepository {
	private queue: Promise<void> = Promise.resolve();
	constructor(private readonly storage: AuditStoragePort) {}

	async list(): Promise<AuditRecord[]> {
		const raw = await this.storage.read();
		if (!raw) return [];
		try {
			const parsed = JSON.parse(raw) as AuditDocument;
			return parsed.schemaVersion === AUDIT_SCHEMA_VERSION && Array.isArray(parsed.records) ? parsed.records.map(sanitize) : [];
		} catch { return []; }
	}

	append(record: AuditRecord): Promise<void> {
		const run = this.queue.then(async () => {
			const records = await this.list();
			records.push(sanitize(record));
			await this.storage.write(JSON.stringify({ schemaVersion: AUDIT_SCHEMA_VERSION, records }, null, 2));
		});
		this.queue = run.catch(() => undefined);
		return run;
	}

	async findByPlanId(planId: string): Promise<AuditRecord[]> {
		return (await this.list()).filter(record => record.planId === planId);
	}

	async destroy(): Promise<void> { await this.queue; }
}
