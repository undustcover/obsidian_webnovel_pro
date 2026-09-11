# P0-085A 当前阶段首次创建

- 实现：`CurrentStagePage` 在 ProjectState 缺失时显示创建表单，只提交正式 ID 候选，并经 `ConsoleApplication.previewProjectState`、变更预览、确认令牌、`TransactionExecutor` 和索引刷新闭环执行。
- 安全：取消由 `ConsoleActionRunner` 返回 `cancelled`，执行回调为零次；重复 key 在首个动作完成前返回 `duplicate`；规划与写入失败显示在 `aria-live` 反馈区。
- 测试：`wave8b-pages.test.ts`、`action-runner.test.ts`、`ConsoleApplication.test.ts`、`project-state.test.ts`。
- 验证：2026-09-11 全量 118 个测试文件、1188 个测试通过；type-check、ESLint、CSS/Obsidian/i18n 审计通过。

