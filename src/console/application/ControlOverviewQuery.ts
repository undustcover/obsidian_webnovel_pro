import type { EntityTypeValue } from '../domain';
import type { IndexSnapshot } from '../indexing';
import type { DashboardModel } from './DashboardQuery';

export interface ControlOverviewModel {
	projectId?: string;
	snapshotVersion?: string;
	totalRecords: number;
	counts: Readonly<Partial<Record<EntityTypeValue, number>>>;
}

export interface NovelOverviewModel extends ControlOverviewModel {
	dashboard: DashboardModel;
	narrativeCounts: Readonly<Record<'book' | 'part' | 'volume' | 'unit' | 'plan' | 'chapter', number>>;
}

export class ControlOverviewQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}

	execute(): ControlOverviewModel {
		const snapshot = this.snapshotProvider();
		const counts: Partial<Record<EntityTypeValue, number>> = {};
		for (const record of snapshot?.records || []) counts[record.type] = (counts[record.type] || 0) + 1;
		return { projectId: snapshot?.projectId, snapshotVersion: snapshot?.version, totalRecords: snapshot?.records.length || 0, counts };
	}

	executeNovel(dashboard: DashboardModel): NovelOverviewModel {
		const overview = this.execute();
		return {
			...overview,
			dashboard,
			narrativeCounts: {
				book: overview.counts.book || 0, part: overview.counts.part || 0,
				volume: overview.counts.volume || 0, unit: overview.counts.unit || 0,
				plan: overview.counts.plan || 0, chapter: overview.counts.chapter || 0,
			},
		};
	}
}
