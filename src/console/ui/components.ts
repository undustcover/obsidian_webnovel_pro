import type { EntityRecord } from '../domain';

export function renderEntitySummary(container: HTMLElement, record: EntityRecord): void {
	const card = container.createDiv({ cls: 'webnovel-console__result' });
	card.dataset.entityKey = record.key;
	card.createEl('strong', { text: record.title });
	card.createSpan({ cls: 'webnovel-console__muted', text: record.id ? ` ${record.id}` : ' Legacy' });
	card.createDiv({ cls: 'webnovel-console__summary', text: `${record.type} · ${record.canon} · ${record.lifecycleStatus}` });
}
