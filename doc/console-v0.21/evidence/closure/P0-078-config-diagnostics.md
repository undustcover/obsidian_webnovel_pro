# P0-078B 项目配置诊断

日期：2026-09-10

## 实现

- 规范化结果增加来源：`none`、`consoleProjects`、`workspaceFolders`。
- 配置诊断增加 `info/error` 严重度；非法项目、重复 ID、重复 root 保持错误诊断并隔离坏条目。
- 旧 `workspaceFolders` 映射生成 `CONFIG_LEGACY_WORKSPACE_DERIVED` 信息诊断，不静默伪装成显式项目。
- 显式与旧配置均为空时返回 `source: none`、空项目和空诊断，不把“尚未配置”伪装成异常。
- `ConsoleIndexRuntime.getConfigDiagnostics()` 向应用层提供防变异副本；未创建任何目录，也未写入 Markdown。

## 验证

- `tests/console/project-config.test.ts` 表驱动覆盖缺配置、合法显式配置、非法项目、重复 ID、重复 root 和旧 workspace 映射。
- `tests/console/indexing.test.ts` 验证合法 runtime 可读取空诊断并保持多项目隔离。
- 本任务相关测试与 `tsc --noEmit` 必须通过后完成。

## 回滚点

仅回滚配置诊断字段、来源标记和 runtime getter；不改变项目目录或用户数据。
