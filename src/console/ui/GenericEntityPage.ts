import type { ConsoleApplication } from '../application';
import type { EntityRecord } from '../domain';
import { bindCardActivation, renderEntitySummary } from './components';
import { getPageDefinition, matchesPageRecord } from './pageRegistry';
import type { ConsolePage } from './router';

export function queryPageEntities(application: ConsoleApplication, page: ConsolePage, query = ''): EntityRecord[] {
	const definition = getPageDefinition(page);
	const filter = definition.entityFilter;
	if (!filter) return [];
	const result = application.search({ query, filters: { types: [...filter.types] }, page: 1, pageSize: 200 });
	return result.items.filter(record => matchesPageRecord(definition, record));
}

export function renderGenericEntityPage(
	container: HTMLElement,
	application: ConsoleApplication,
	page: ConsolePage,
	query: string,
	onSelect: (record: EntityRecord) => void,
): void {
	const definition = getPageDefinition(page);
	const records = queryPageEntities(application, page, query);
	if (definition.entityFilter?.rawTypeAliases) container.createDiv({ cls: 'webnovel-console__notice', text: '只读资料：类型按既有 Properties 兼容识别，不会自动改写为正式实体。' });
	if (!records.length) container.createDiv({ cls: 'webnovel-console__empty', text: definition.emptyState });
	for (const record of records) {
		renderEntitySummary(container, record);
		const card = container.lastElementChild as HTMLElement;
		bindCardActivation(card, () => onSelect(record));
	}
}
