import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const viewSource = readFileSync('src/console/ui/NovelConsoleView.ts', 'utf8');
const healthSource = readFileSync('src/console/ui/HealthPage.ts', 'utf8');
const css = readFileSync('src/console/ui/console.css', 'utf8');

describe('Console accessibility release contract', () => {
	it('uses native keyboard controls and labels the navigation, search, details and form controls', () => {
		expect(viewSource).toContain("createEl('nav'");
		expect(viewSource).toContain("'aria-label': '小说控制台导航'");
		expect(viewSource).toContain("createEl('form'");
		expect(viewSource).toContain("role: 'search'");
		expect(viewSource).toContain("type: 'search'");
		expect(viewSource).toContain("'aria-label': '搜索关键词'");
		expect(viewSource).toContain("'aria-label': '执行搜索'");
		expect(viewSource).toContain("'aria-label': '资料详情'");
		expect(viewSource).toContain("'aria-label': '关闭资料详情'");
		expect(viewSource).toContain("createEl('button'");
		expect(viewSource).toContain("createEl('select'");
	});

	it('keeps status meaning in visible text instead of color alone', () => {
		for (const severity of ['error', 'warning', 'suggestion', 'author_confirmation']) {
			expect(healthSource).toContain(severity);
		}
		expect(healthSource).toContain('item.ruleId');
		expect(healthSource).toContain('item.severity');
	});

	it('disables Console transitions when reduced motion is requested', () => {
		expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
		expect(css).toMatch(/\.webnovel-console[\s\S]*transition:\s*none/);
	});
});
