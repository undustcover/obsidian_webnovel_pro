import type { EntityLink, EntityRecord } from '../domain';

export class RelationIndex {
	private outgoing = new Map<string, EntityLink[]>();
	private incoming = new Map<string, EntityLink[]>();

	constructor(records: readonly EntityRecord[]) {
		for (const record of records) {
			for (const link of record.links) {
				this.outgoing.set(record.key, [...(this.outgoing.get(record.key) || []), link]);
				this.incoming.set(link.toRef, [...(this.incoming.get(link.toRef) || []), link]);
			}
		}
	}

	getOutgoing(key: string): readonly EntityLink[] { return this.outgoing.get(key) || []; }
	getIncoming(keyOrId: string): readonly EntityLink[] { return this.incoming.get(keyOrId) || []; }
	affectedByTarget(keyOrId: string): readonly string[] { return [...new Set(this.getIncoming(keyOrId).map((link) => link.fromKey))]; }
}
