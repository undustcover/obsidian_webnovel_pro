import type { SourceLocation } from './entities';

export type LinkDirection = 'outgoing' | 'incoming' | 'bidirectional';

export interface EntityLink {
	type: string;
	fromKey: string;
	toRef: string;
	direction: LinkDirection;
	source: SourceLocation;
	validFrom?: string;
	validTo?: string;
	evidence?: string[];
	canon?: 'canon' | 'candidate' | 'conflict' | 'unknown';
}
