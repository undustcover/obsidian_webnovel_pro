import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const file = path.resolve(__dirname, '../src/console/ui/console.css');
const root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
const errors: string[] = [];

root.walkRules(rule => {
	selectorParser(selectors => {
		selectors.each(selector => {
			let scoped = false;
			selector.walkClasses(node => {
				if (node.value === 'webnovel-console' || node.value === 'webnovel-console-modal') scoped = true;
			});
			if (!scoped) errors.push(`${rule.source?.start?.line || 1}: ${selector.toString()} is not Console-scoped`);
		});
	}).processSync(rule.selector);
});

if (errors.length) {
	console.error(errors.join('\n'));
	process.exitCode = 1;
} else console.log('Console CSS scope audit passed.');
