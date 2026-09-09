import type { ConsoleProjectConfig } from '../config';

const normalize = (path: string): string => path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

export class ProjectScopeResolver {
	contains(project: ConsoleProjectConfig, path: string): boolean {
		const root = normalize(project.root);
		const candidate = normalize(path);
		return root === '' || candidate === root || candidate.startsWith(`${root}/`);
	}

	filter(project: ConsoleProjectConfig, paths: readonly string[]): string[] {
		return paths.filter((path) => this.contains(project, path));
	}
}
