# P0-078C 应用层状态映射

日期：2026-09-10

## 映射规则

- 无项目且无错误诊断：`unconfigured`，建议 `configure`。
- 无项目且有错误诊断：`error / CONSOLE_CONFIG_INVALID`。
- 项目存在但 active project 无效：`error / CONSOLE_PROJECT_UNKNOWN`。
- 索引正在扫描或尚无首个 snapshot：`initializing`。
- 有完整 snapshot（包括零记录）：`ready`。
- 部分文件失败或派生缓存写入失败且仍有 snapshot：`degraded`，保留记录数和恢复动作。
- 扫描失败：`error / INDEX_SCAN_FAILED`，提供技术详情和 retry/rebuild。

Dashboard 直接使用 `ConsoleApplication.getIndexState()` 的同一状态对象，不再自行把“无 snapshot”硬编码为 `error`。查询仍在无 snapshot 时返回受控空结果，但不会把它表达为成功状态；所有写入预览继续拒绝无 snapshot。

## 验证

- `tests/console/ConsoleApplication.test.ts` 替换旧“无配置即 error”断言，并覆盖 ready 零记录。
- `tests/console/dashboard.test.ts` 断言 Dashboard 的状态与应用层一致。
- ConsoleApplication、Dashboard、project config 与 indexing 相关 27 项测试通过；`tsc --noEmit` 通过。
- P0-078 父任务 lint 通过：Stylelint、ESLint、Obsidian API audit 和 i18n audit 退出码均为 0；仅有既有 Obsidian API 建议，无失败。

## 回滚点

ConsoleApplication 状态映射与 Dashboard availability 字段同批回滚；不改变 EntityIndexService 的索引算法。
