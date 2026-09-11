# P0-089A 首次使用 fixture 矩阵

日期：2026-09-11

## 实现与边界

- 新增 `tests/fixtures/console/first-run/generator.ts`，确定性生成空配置、旧 `workspaceFolders`、非法配置、多项目和零文件项目五类设置/Vault fixture。
- 新增共享 runtime harness，以真实 `ConsoleIndexRuntime` 消费 fixture；Vault、metadata cache 与派生缓存仅使用内存端口，不写用户 Markdown。
- fixture 生成结果使用深拷贝隔离调用方变异，不包含 `console-index-v1-*` 派生缓存条目。

## 自动验证

- `first-run-fixtures.test.ts`：6/6 通过，覆盖矩阵完整性、重复生成等价、变异隔离、无派生缓存和五类 runtime 消费。
- 与 P0-089B/C、既有 recovery/view lifecycle/indexing 合并回归：6 个测试文件、39/39 通过。
- `node node_modules/typescript/bin/tsc --noEmit` 通过。
- ESLint、Stylelint、CSS architecture/scope、Obsidian API 与 i18n audit 全部通过；Obsidian audit 仅报告既有建议项。

## 回滚点

可独立删除 `first-run/` fixture、共享 harness 和对应测试，不影响生产代码或用户数据。

