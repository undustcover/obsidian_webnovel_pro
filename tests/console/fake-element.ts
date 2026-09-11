export class FakeElement {
	children: FakeElement[] = [];
	className = '';
	disabled = false;
	tabIndex = -1;
	value = '';
	attributes: Record<string, string> = {};
	isConnected = true;
	private ownText = '';
	private listeners = new Map<string, Array<(event: { preventDefault(): void; key?: string }) => void>>();
	constructor(readonly tagName = 'DIV', text = '') { this.ownText = text; }
	get textContent(): string { return this.ownText + this.children.map(child => child.textContent).join(''); }
	createDiv(options?: { cls?: string; text?: string; attr?: Record<string, string> }): FakeElement { return this.append('DIV', options); }
	createSpan(options?: { cls?: string; text?: string; attr?: Record<string, string> }): FakeElement { return this.append('SPAN', options); }
	createEl(tag: string, options?: { cls?: string; text?: string; value?: string; attr?: Record<string, string> }): FakeElement { return this.append(tag.toUpperCase(), options); }
	empty(): void { this.children = []; this.ownText = ''; }
	addClass(name: string): void { this.className = `${this.className} ${name}`.trim(); }
	setAttribute(name: string, value: string): void { this.attributes[name] = value; }
	addEventListener(type: string, listener: (event: { preventDefault(): void; key?: string }) => void): void { const values = this.listeners.get(type) || []; values.push(listener); this.listeners.set(type, values); }
	click(): void { this.dispatch('click'); }
	dispatch(type: string, event: { key?: string } = {}): void { for (const listener of this.listeners.get(type) || []) listener({ preventDefault: () => undefined, ...event }); }
	toggleAttribute(name: string, force: boolean): void { if (force) this.attributes[name] = ''; else delete this.attributes[name]; }
	findAll(tag: string): FakeElement[] { return this.children.flatMap(child => [...(child.tagName === tag.toUpperCase() ? [child] : []), ...child.findAll(tag)]); }
	private append(tag: string, options?: { cls?: string; text?: string; value?: string; attr?: Record<string, string> }): FakeElement { const child = new FakeElement(tag, options?.text || ''); child.className = options?.cls || ''; child.value = options?.value || ''; child.attributes = { ...(options?.attr || {}) }; this.children.push(child); return child; }
}
