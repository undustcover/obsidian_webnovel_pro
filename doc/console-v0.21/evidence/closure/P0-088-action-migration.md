# P0-088B 全部 Console 写入口迁移

- 入口清单：ProjectState 创建/焦点/游标，事件创建/字段/三状态/三时间轴重要度，章节标题，Context 发布，任务创建/状态，五类建议决策，里程碑推进，伏笔修改。
- 统一边界：所有入口经 `NovelConsoleView.runAction` → `ConsoleActionRunner` → `ChangePreviewModal` → plan-bound token → `ConsoleApplication.execute`；没有保留 `openChangePreview` 或 `.then(change => ...)` 旧路径。
- 反馈：当前按钮 busy 禁用；planning、等待确认、执行、成功、取消和错误在 `aria-live` 区域可见；冲突/令牌/补偿仍由 TransactionExecutor 保证。
- 测试：`action-entry-audit.test.ts`、`action-runner.test.ts`、`wave8b-pages.test.ts`、`wave8b-facade.test.ts`、`transaction.test.ts`、`recovery.test.ts`。
- 验证：入口静态审计、代表性 UI、同步/异步规划失败、并发冲突、取消及失败补偿通过。

