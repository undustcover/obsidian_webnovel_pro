export interface ProjectSelection {
	projectId?: string;
	recovered: boolean;
}

export function resolveProjectSelection(projectIds: readonly string[], requestedProjectId?: string, activeProjectId?: string): ProjectSelection {
	const ids = [...new Set(projectIds.filter(Boolean))];
	if (requestedProjectId && ids.includes(requestedProjectId)) return { projectId: requestedProjectId, recovered: false };
	if (activeProjectId && ids.includes(activeProjectId)) return { projectId: activeProjectId, recovered: Boolean(requestedProjectId) };
	return { projectId: ids[0], recovered: Boolean(requestedProjectId || activeProjectId) };
}

export function renderProjectSelector(
	container: HTMLElement,
	projectIds: readonly string[],
	activeProjectId: string | undefined,
	onSelect: (projectId: string) => void,
): HTMLSelectElement {
	const wrapper = container.createDiv({ cls: 'webnovel-console__project-selector' });
	wrapper.createEl('label', { text: '当前项目', attr: { for: 'webnovel-console-project' } });
	const select = wrapper.createEl('select', { attr: { id: 'webnovel-console-project', 'aria-label': '当前项目' } });
	if (projectIds.length === 0) select.createEl('option', { value: '', text: '未配置项目' });
	else for (const projectId of projectIds) select.createEl('option', { value: projectId, text: projectId });
	select.value = activeProjectId && projectIds.includes(activeProjectId) ? activeProjectId : projectIds[0] ?? '';
	select.disabled = projectIds.length < 2;
	select.addEventListener('change', () => { if (select.value) onSelect(select.value); });
	return select;
}
