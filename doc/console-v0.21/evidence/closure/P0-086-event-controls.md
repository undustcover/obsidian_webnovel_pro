# P0-086B 事件状态与重要度反馈

- 实现：事实状态、叙事状态、读者知识状态及现实/隐藏/宇宙时间轴重要度均独立规划；全部入口统一显示 planning、confirmation、executing、success/error/cancel 状态并禁用当前按钮。
- 隔离：时间轴更新只生成目标字段 diff；`previewTimelineImportance` 使用统一影响分析，不覆盖其他视图。
- 测试：`event-states.test.ts`、`timeline-projection.test.ts`、`action-runner.test.ts`、`action-entry-audit.test.ts`。
- 验证：状态转换矩阵、目标字段 diff、冲突与失败可见性测试及全量门禁通过。

