import { PropertiesEntityAdapter } from './PropertiesEntityAdapter';
import type { AdapterSource, EntityAdapter } from './types';

export class ForeshadowingPropertiesAdapter implements EntityAdapter {
	readonly id = 'foreshadowing-properties-v1';
	private base = new PropertiesEntityAdapter();
	canParse(source: AdapterSource): boolean { const id = source.frontmatter?.id; return source.frontmatter?.type === 'foreshadowing' || source.frontmatter?.type === '伏笔' || (typeof id === 'string' && id.startsWith('FSH-')); }
	parse(source: AdapterSource) { return this.base.parse(source).filter(record => record.type === 'foreshadowing').map(record => ({ ...record, data: { ...record.data, truth_event_ids: array(record.data.truth_event_ids), plant_before: array(record.data.plant_before), advance_when: array(record.data.advance_when), reveal_after: array(record.data.reveal_after), status: record.data.status || 'planned' } })); }
}
const array = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
