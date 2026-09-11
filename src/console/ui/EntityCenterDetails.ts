import { Setting } from 'obsidian';
import type { CharacterCenter, ItemCenter } from '../application';
import type { EntityRecord } from '../domain';

const CORE_FIELDS: Readonly<Record<'character' | 'item', readonly string[]>> = {
	character: ['story_status', 'current_location_id', 'role', 'goal', 'description'],
	item: ['current_holder_ids', 'holder_history', 'category', 'status', 'description'],
};

const displayValue = (value: unknown): string => {
	if (value === undefined || value === null || value === '') return '未记录';
	if (typeof value === 'string') return value;
	return JSON.stringify(value);
};

export function renderGenericRecordDetails(container: HTMLElement, record: EntityRecord): void {
	container.createDiv({ text: `类型：${record.type} · ID：${record.id || 'Legacy'} · canon：${record.canon} · 状态：${record.lifecycleStatus}` });
	const fields = Object.entries(record.data).filter(([field, value]) => !['body', 'content', 'markdown'].includes(field) && value !== undefined).slice(0, 12);
	if (fields.length) {
		const section = container.createDiv({ cls: 'webnovel-console__section' });
		new Setting(section).setName('核心字段').setHeading();
		for (const [field, value] of fields) section.createDiv({ text: `${field}：${displayValue(value).slice(0, 240)}` });
	}
	renderRelations(container, record);
}

function renderCoreFields(container: HTMLElement, record: EntityRecord & { type: 'character' | 'item' }): void {
	const section = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(section).setName('核心字段').setHeading();
	for (const field of CORE_FIELDS[record.type]) section.createDiv({ text: `${field}：${displayValue(record.data[field])}` });
}

function renderRelatedRecords(container: HTMLElement, title: string, records: readonly EntityRecord[], onOpen: (record: EntityRecord) => void): void {
	const section = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(section).setName(`${title} · ${records.length}`).setHeading();
	if (!records.length) { section.createDiv({ cls: 'webnovel-console__muted', text: '无' }); return; }
	for (const record of records) {
		const button = section.createEl('button', { text: `${record.title} · ${record.id || record.key}`, attr: { type: 'button' } });
		button.addEventListener('click', () => onOpen(record));
	}
}

function renderRelations(container: HTMLElement, record: EntityRecord): void {
	const section = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(section).setName(`关系 · ${record.links.length}`).setHeading();
	if (!record.links.length) section.createDiv({ cls: 'webnovel-console__muted', text: '无显式关系。' });
	for (const link of record.links) section.createDiv({ text: `${link.type} → ${link.toRef} · ${link.source.path}` });
}

export function renderCharacterCenterDetails(container: HTMLElement, center: CharacterCenter, onOpen: (record: EntityRecord) => void): void {
	renderCoreFields(container, center.character as EntityRecord & { type: 'character' });
	renderRelations(container, center.character);
	renderRelatedRecords(container, '事件经历', center.events, onOpen);
	renderRelatedRecords(container, '章节经历', center.chapters, onOpen);
	for (const conflict of center.conflicts) container.createDiv({ cls: 'webnovel-console__warning', text: `冲突证据：${conflict} · current_location_id=${displayValue(center.character.data.current_location_id)}` });
}

export function renderItemCenterDetails(container: HTMLElement, center: ItemCenter, onOpen: (record: EntityRecord) => void): void {
	renderCoreFields(container, center.item as EntityRecord & { type: 'item' });
	renderRelations(container, center.item);
	container.createDiv({ text: `当前持有者：${center.currentHolders.join(', ') || '无'}` });
	const history = container.createDiv({ cls: 'webnovel-console__section' });
	new Setting(history).setName(`持有历史 · ${center.holderHistory.length}`).setHeading();
	for (const entry of center.holderHistory) history.createDiv({ text: displayValue(entry) });
	if (!center.holderHistory.length) history.createDiv({ cls: 'webnovel-console__muted', text: '无' });
	renderRelatedRecords(container, '关联事件', center.events, onOpen);
	renderRelatedRecords(container, '关联章节', center.chapters, onOpen);
	for (const conflict of center.conflicts) container.createDiv({ cls: 'webnovel-console__warning', text: `冲突证据：${conflict} · holders=${center.currentHolders.join(', ')}` });
}
