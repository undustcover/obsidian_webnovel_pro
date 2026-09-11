/**
 * Obsidian API 的最小 Mock
 * 仅提供测试所需的类型桩，避免测试依赖完整的 Obsidian 运行环境
 */

const mockWindow = {
	setTimeout: (handler: () => void, timeout?: number) => setTimeout(handler, timeout),
	clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
	console: globalThis.console
};

Object.assign(globalThis, { window: mockWindow });

export class TAbstractFile {
	name: string = '';
	path: string = '';
	vault: any = {};
	parent: TFolder | null = null;

	constructor(name: string = '', path: string = '') {
		this.name = name;
		this.path = path;
	}
}

export class TFile extends TAbstractFile {
	extension: string = 'md';
	basename: string = '';
	stat: any = {};

	constructor(name: string = '', path: string = '') {
		super(name, path);
		this.basename = name ? name.replace(/\.[^/.]+$/, '') : '';
		this.extension = name && name.includes('.') ? name.split('.').pop() || 'md' : 'md';
	}
}

export class TFolder extends TAbstractFile {
	children: (TFile | TFolder)[] = [];

	constructor(name: string = '', path: string = '') {
		super(name, path);
	}

	isRoot(): boolean {
		return this.path === '/' || this.path === '';
	}
}

export class Vault {
	static recurseChildren(folder: TFolder, fn: (file: any) => void): void {
		if (!folder || !folder.children) return;
		for (const child of folder.children) {
			fn(child);
			if (child instanceof TFolder) {
				Vault.recurseChildren(child, fn);
			}
		}
	}
}

export class Platform {
	static isMobile = false;
}

export class Component {}

export const mockNoticeMessages: string[] = [];

export function resetNoticeMessages(): void {
	mockNoticeMessages.length = 0;
}

export class Notice {
	message: string | DocumentFragment;
	timeout?: number;

	constructor(message: string | DocumentFragment = '', timeout?: number) {
		this.message = message;
		this.timeout = timeout;
		if (typeof message === 'string') {
			mockNoticeMessages.push(message);
		}
	}

	hide(): void {}
}

export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');
}

const parseYamlScalar = (value: string): unknown => {
	const trimmed = value.trim();
	if (!trimmed) return {};
	try { return JSON.parse(trimmed); } catch { return trimmed.replace(/^(["'])(.*)\1$/, '$2'); }
};

export function parseYaml(source: string): unknown {
	const root: Record<string, unknown> = {};
	let nested: Record<string, unknown> | undefined;
	for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
		if (!line.trim() || line.trimStart().startsWith('#')) continue;
		const child = line.match(/^\s{2,}([^:]+):\s*(.*)$/);
		if (child && nested) { nested[child[1].trim().replace(/^(["'])(.*)\1$/, '$2')] = parseYamlScalar(child[2]); continue; }
		const field = line.match(/^([^:]+):\s*(.*)$/);
		if (!field) throw new Error('Invalid YAML');
		const key = field[1].trim();
		const value = field[2];
		if (!value.trim()) { nested = {}; root[key] = nested; }
		else { root[key] = parseYamlScalar(value); nested = undefined; }
	}
	return root;
}

if (typeof Element !== 'undefined') {
	const proto = Element.prototype as any;
	if (!proto.addClass) {
		proto.addClass = function (...classes: string[]) {
			this.classList.add(...classes);
			return this;
		};
	}
	if (!proto.removeClass) {
		proto.removeClass = function (...classes: string[]) {
			this.classList.remove(...classes);
			return this;
		};
	}
	if (!proto.empty) {
		proto.empty = function () {
			this.innerHTML = '';
		};
	}
	if (!proto.createDiv) {
		proto.createDiv = function (o?: any) {
			const div = document.createElement('div');
			if (o?.cls) div.className = o.cls;
			if (o?.text) div.textContent = o.text;
			this.appendChild(div);
			return div;
		};
	}
	if (!proto.createSpan) {
		proto.createSpan = function (o?: any) {
			const span = document.createElement('span');
			if (o?.cls) span.className = o.cls;
			if (o?.text) span.textContent = o.text;
			this.appendChild(span);
			return span;
		};
	}
	if (!proto.createEl) {
		proto.createEl = function (tag: string, o?: any) {
			const el = document.createElement(tag);
			if (o?.cls) el.className = o.cls;
			if (o?.text) el.textContent = o.text;
			if (o?.type) (el as HTMLInputElement).type = o.type;
			this.appendChild(el);
			return el;
		};
	}
}

export class Modal {
	app: any;
	modalEl: any;
	contentEl: any;

	constructor(app: any) {
		this.app = app;
		const createMockEl = () => ({
			empty: () => {},
			addClass: function() { return this; },
			removeClass: function() { return this; },
			setAttribute: () => {},
			style: { setProperty: () => {} },
			setText: () => {},
			createDiv: function(o?: any) { return createMockEl(); },
			createSpan: function(o?: any) { return createMockEl(); },
			createEl: function(tag?: string, o?: any) { return createMockEl(); },
			appendChild: () => {}
		});
		this.modalEl = typeof document !== 'undefined' ? document.createElement('div') : createMockEl();
		this.contentEl = typeof document !== 'undefined' ? document.createElement('div') : createMockEl();
	}
	open() {
		if (typeof (this as any).onOpen === 'function') {
			(this as any).onOpen();
		}
	}
	close() {
		if (typeof (this as any).onClose === 'function') {
			(this as any).onClose();
		}
	}
}

export class Setting {
	constructor(containerEl: any) {}
	setHeading() { return this; }
	setName(name: any) { return this; }
	setDesc(desc: any) { return this; }
	addToggle(cb: any) { return this; }
	addButton(cb: any) { return this; }
	addExtraButton(cb: any) { return this; }
}

export function setIcon(el: any, iconId: string) {}

export class MarkdownView {
	file?: any;
	editor?: any;
	containerEl?: any;
	getMode?(): string {
		return 'source';
	}
}

export class WorkspaceLeaf {
	view?: any;
	parent?: any;
	openFile(file: any, options?: any): Promise<void> {
		return Promise.resolve();
	}
	getViewState(): any {
		return {};
	}
}

export class ItemView {
	leaf: WorkspaceLeaf;
	containerEl: unknown;
	contentEl: any;
	app: unknown;
	constructor(leaf: WorkspaceLeaf) {
		this.leaf = leaf;
		this.app = (leaf as unknown as { app?: unknown }).app ?? {};
		type MockElement = {
			empty: () => void;
			addClass: () => MockElement;
			removeClass: () => MockElement;
			setAttribute: () => void;
			style: { setProperty: () => void };
			setText: () => void;
			createDiv: () => MockElement;
			createSpan: () => MockElement;
			createEl: () => MockElement;
			appendChild: () => void;
			children: MockElement[];
			dataset: Record<string, string>;
			hasClass: (name: string) => boolean;
		};
		const createMockEl = (withChildren = false): MockElement => {
			const el: MockElement = {
				empty: () => {},
				addClass: () => el,
				removeClass: () => el,
				setAttribute: () => {},
				style: { setProperty: () => {} },
				setText: () => {},
				createDiv: () => createMockEl(false),
				createSpan: () => createMockEl(false),
				createEl: () => createMockEl(false),
				appendChild: () => {},
				children: [],
				dataset: {},
				hasClass: () => false
			};
			if (withChildren) {
				el.children = [createMockEl(false), createMockEl(false)];
			}
			return el;
		};
		if (typeof document !== 'undefined') {
			const containerEl = document.createElement('div');
			containerEl.createDiv({ cls: 'view-header' });
			containerEl.createDiv({ cls: 'view-content' });
			this.containerEl = containerEl;
			this.contentEl = containerEl.children[1];
		} else {
			this.containerEl = createMockEl(true);
			this.contentEl = (this.containerEl as MockElement).children[1];
		}
	}
	getViewType(): string { return ''; }
	getDisplayText(): string { return ''; }
	getIcon(): string { return ''; }
	onOpen(): Promise<void> { return Promise.resolve(); }
	onClose(): Promise<void> { return Promise.resolve(); }
}

export class Menu {
	addItem(cb: (item: {
		setTitle: () => unknown;
		setIcon: () => unknown;
		setChecked: () => unknown;
		onClick: () => unknown;
	}) => void) {
		const item = {
			setTitle: () => item,
			setIcon: () => item,
			setChecked: () => item,
			onClick: () => item,
		};
		cb(item);
		return this;
	}
	showAtMouseEvent(_evt: unknown) {}
}

export async function requestUrl(_params: unknown): Promise<{
	status: number;
	headers: Record<string, string>;
	arrayBuffer: ArrayBuffer;
	text: string;
	json: unknown;
}> {
	return { status: 200, headers: {}, arrayBuffer: new ArrayBuffer(0), text: '', json: {} };
}
