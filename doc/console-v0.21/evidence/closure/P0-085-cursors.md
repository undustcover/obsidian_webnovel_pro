# P0-085C 故事线游标推进 UI

- 实现：CurrentStagePage 按故事线分别展示当前游标和该线目标事件；事件详情只给出同线建议按钮；作者点击后才进入影响预览、确认和执行。
- 安全：服务拒绝事件缺失与跨线目标；不可达建议保留 `unreachable` 解释且零写入；取消不执行，撤销提示明确不回滚其他事实。
- 测试：`cursor-suggestions.test.ts`、`progression-integration.test.ts`、`wave8b-pages.test.ts`、`action-runner.test.ts`。
- 验证：多线、不可达、跨线、取消零写入及 AC-14～16 对应 UI 边界通过。

