import type { DiagnosticRef, DiagnosticSeverity } from '../domain';
export function renderHealthPage(container: HTMLElement, diagnostics: readonly DiagnosticRef[], severity?: DiagnosticSeverity): void {
	const controls = container.createDiv({ cls: 'webnovel-console__actions' });
	for (const option of ['全部', 'error', 'warning', 'suggestion', 'author_confirmation'] as const) { const button = controls.createEl('button', { text: option, attr: { type: 'button' } }); button.addEventListener('click', () => { container.empty(); renderHealthPage(container, diagnostics, option === '全部' ? undefined : option); }); }
	const items = severity ? diagnostics.filter(item => item.severity === severity) : diagnostics;
	if (!items.length) { container.createDiv({ cls: 'webnovel-console__empty', text: '当前筛选下没有健康问题。' }); return; }
	for (const item of items) { const card = container.createDiv({ cls: 'webnovel-console__result' }); card.dataset.ruleId = item.ruleId; card.createEl('strong', { text: `${item.ruleId} · ${item.severity}` }); card.createDiv({ text: item.message }); card.createDiv({ text: item.evidence.map(evidence => `${evidence.path}${evidence.field ? `#${evidence.field}` : ''}`).join('；') }); if (item.autoFixKind) card.createEl('button', { text: `安全修复：${item.autoFixKind}`, attr: { type: 'button' } }); }
}
