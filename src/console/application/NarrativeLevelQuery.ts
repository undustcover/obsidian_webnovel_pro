import type { DiagnosticRef } from '../domain';
import type { IndexSnapshot } from '../indexing';
import { NarrativeTreeQuery, type NarrativeTreeNode } from './NarrativeTreeQuery';

export type NarrativeLevel = 'book' | 'part' | 'volume' | 'unit' | 'plan' | 'chapter';

export interface NarrativeLevelItem {
	node: NarrativeTreeNode;
	ancestors: readonly Pick<NarrativeTreeNode, 'key' | 'type' | 'title'>[];
}

export interface NarrativeLevelResult { items: NarrativeLevelItem[]; diagnostics: DiagnosticRef[] }

export class NarrativeLevelQuery {
	constructor(private readonly snapshotProvider: () => IndexSnapshot | undefined) {}

	execute(level: NarrativeLevel): NarrativeLevelResult {
		const tree = new NarrativeTreeQuery(this.snapshotProvider).execute();
		const items: NarrativeLevelItem[] = [];
		const visit = (node: NarrativeTreeNode, ancestors: NarrativeLevelItem['ancestors']) => {
			if (node.type === level) items.push({ node, ancestors });
			const next = [...ancestors, { key: node.key, type: node.type, title: node.title }];
			for (const child of node.children) visit(child, next);
		};
		for (const root of tree.roots) visit(root, []);
		return { items, diagnostics: tree.diagnostics };
	}
}
