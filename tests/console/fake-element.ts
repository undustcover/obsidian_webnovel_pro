export class FakeElement {
	children: FakeElement[] = [];
	className = '';
	disabled = false;
	private ownText = '';
	private listeners = new Map<string, Array<() => void>>();
	constructor(readonly tagName = 'DIV', text = '') { this.ownText = text; }
	get textContent(): string { return this.ownText + this.children.map(child => child.textContent).join(''); }
	createDiv(options?: { cls?: string; text?: string }): FakeElement { return this.append('DIV', options); }
	createEl(tag: string, options?: { cls?: string; text?: string; attr?: Record<string, string> }): FakeElement { return this.append(tag.toUpperCase(), options); }
	empty(): void { this.children = []; this.ownText = ''; }
	addEventListener(type: string, listener: () => void): void { const values = this.listeners.get(type) || []; values.push(listener); this.listeners.set(type, values); }
	click(): void { for (const listener of this.listeners.get('click') || []) listener(); }
	findAll(tag: string): FakeElement[] { return this.children.flatMap(child => [...(child.tagName === tag.toUpperCase() ? [child] : []), ...child.findAll(tag)]); }
	private append(tag: string, options?: { cls?: string; text?: string }): FakeElement { const child = new FakeElement(tag, options?.text || ''); child.className = options?.cls || ''; this.children.push(child); return child; }
}
