import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

export type ConsoleErrorAuditCode = 'UNHANDLED_PROMISE' | 'EMPTY_CATCH' | 'ERROR_WITHOUT_RECOVERY';
export interface ConsoleErrorAuditIssue { code: ConsoleErrorAuditCode; file: string; line: number; excerpt: string }

const feedbackPattern = /reportUiFailure|feedback|message|onState|setText|createSpan|throw|session\.submit/;

export function auditConsoleErrorFeedback(source: string, file = '<source>'): ConsoleErrorAuditIssue[] {
	const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const issues: ConsoleErrorAuditIssue[] = [];
	const report = (node: ts.Node, code: ConsoleErrorAuditCode) => {
		const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
		issues.push({ code, file, line, excerpt: node.getText(ast).replace(/\s+/g, ' ').slice(0, 180) });
	};
	const visit = (node: ts.Node): void => {
		if (ts.isExpressionStatement(node) && ts.isVoidExpression(node.expression)) {
			const text = node.expression.getText(ast);
			if (!text.includes('.catch(') && !text.includes('session.submit()')) report(node, 'UNHANDLED_PROMISE');
			if (text.includes('.catch(') && !feedbackPattern.test(text)) report(node, 'ERROR_WITHOUT_RECOVERY');
		}
		if (ts.isCatchClause(node)) {
			if (node.block.statements.length === 0) report(node, 'EMPTY_CATCH');
			else if (!feedbackPattern.test(node.block.getText(ast))) report(node, 'ERROR_WITHOUT_RECOVERY');
		}
		ts.forEachChild(node, visit);
	};
	visit(ast);
	return issues;
}

export function auditConsoleUiDirectory(directory = 'src/console/ui'): ConsoleErrorAuditIssue[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return auditConsoleUiDirectory(path);
		return entry.isFile() && entry.name.endsWith('.ts') ? auditConsoleErrorFeedback(readFileSync(path, 'utf8'), path) : [];
	});
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/console-error-feedback-audit.ts')) {
	const issues = auditConsoleUiDirectory();
	if (issues.length) {
		for (const issue of issues) console.error(`${issue.file}:${issue.line} ${issue.code} ${issue.excerpt}`);
		process.exitCode = 1;
	} else console.log('Console error feedback audit passed.');
}

