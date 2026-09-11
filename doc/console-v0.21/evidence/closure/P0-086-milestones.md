# P0-086C 里程碑详情与推进

- 实现：详情展示 storyline、当前状态、completion 模式、requiredEventIds 和领域求值结果；状态推进只调用 `previewMilestoneProgression`，不在 UI 重算算法。
- 安全：all/any/sequence/manual 均只返回求值，不自动完成；非法状态转换在规划阶段失败；影响报告展开条件事件。
- 测试：`milestones.test.ts`、`progression-integration.test.ts`、`wave8b-pages.test.ts`、`wave8b-facade.test.ts`。
- 验证：四模式、不可比较、缺失事件、非法转换和预览确认路径通过。

