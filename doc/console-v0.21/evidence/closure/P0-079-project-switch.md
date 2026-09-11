# P0-079C 项目选择器

日期：2026-09-10

## 实现

- Console 工具栏始终展示当前项目：无项目显示禁用的“未配置项目”，单项目显示禁用选择器，多项目允许切换。
- `resolveProjectSelection` 按“持久化 projectId → 当前 runtime active → 首个项目”恢复，失效 ID 不会保留。
- 选择成功后同步更新 runtime active project 与 `ConsoleRouterState.projectId`，清除 selectedKey/detailsOpen，并请求 Obsidian 保存布局状态。
- 所有页面仍通过同一个 ConsoleApplication 获取当前 active project 的 index，不合并不同项目 snapshot。

## 验证

- 选择器与路由测试覆盖 0/1/多项目、原生 select change、失效 projectId 恢复和 projectId 状态恢复。
- 应用集成测试使用两个不同 snapshot，确认切换后 availability.projectId、recordCount 与搜索标题同时属于目标项目。
- `project-selector`、`routing`、`ConsoleApplication` 共 15 项测试通过；`tsc --noEmit` 与定向 ESLint 通过。

## 回滚点

移除 ProjectSelector、NovelConsoleView 工具栏接线和对应 CSS；不会修改项目配置或用户 Markdown。
