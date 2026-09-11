import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/console/ui/NovelConsoleView.ts', 'utf8');

describe('Console write-entry audit', () => {
	it('routes every Wave 8 write preview through the shared action runner', () => {
		const directPreviewMethods = [
			'previewProjectState', 'previewCursorProgression', 'previewEventCreate', 'previewEventFields',
			'previewTaskCreate', 'previewTaskStatus', 'previewSuggestionDecision', 'previewForeshadowingUpdate',
			'previewMilestoneProgression', 'previewChapterUpdate', 'previewContextOutput',
		];
		for (const method of directPreviewMethods) {
			const usage = source.match(new RegExp(`runAction\\([^\\n]+${method}`, 'g')) || [];
			expect(usage.length, `${method} must be wrapped by runAction`).toBeGreaterThan(0);
		}
		for (const method of ['previewTimelineImportance', 'previewEventProgression', 'previewNarrativeProgression', 'previewReaderProgression']) expect(source).toContain(method);
		expect(source).toMatch(/button\.addEventListener\('click', \(\) => this\.runAction\(`event:/);
		expect(source).not.toContain('openChangePreview');
		expect(source).not.toMatch(/\.then\(change\s*=>/);
	});

	it('keeps confirmation and execution inside the single runner boundary', () => {
		expect(source).toContain('this.actionRunner.run(');
		expect(source).toContain('this.presentChangePreview(preview)');
		expect(source).toContain('this.application!.execute(preview.plan, token)');
	});
});
