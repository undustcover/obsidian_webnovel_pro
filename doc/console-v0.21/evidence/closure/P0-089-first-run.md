# P0-089B 首次使用集成测试

日期：2026-09-11

## 集成断言

- 五类 fixture 均从配置解析进入真实 runtime `initialize()`，再由 `ConsoleApplication.getIndexState()` 断言最终状态。
- 空配置稳定返回 `unconfigured / CONSOLE_PROJECT_UNCONFIGURED`，不显示技术性 ERROR。
- 非法配置返回 `error / CONSOLE_CONFIG_INVALID` 并保留 `CONFIG_INVALID_PROJECT` 诊断；旧 workspace 正确派生项目并 ready。
- 首次配置测试从 `persistConsoleProjects` 进入设置保存回调、`ConsoleApplication.reconfigureProjects` 和真实索引构建，零文件项目无需重载即 ready。
- 多项目初始化后切换项目，实体结果和 ready 摘要保持项目隔离。

## 自动验证

- `first-run-integration.test.ts`：7/7 通过。
- P0-089 相关合并回归：39/39 通过；type-check 与完整源码/样式/架构/i18n/Obsidian audit 通过。

## 回滚点

本任务仅新增集成测试与证据，无生产写入或迁移。

