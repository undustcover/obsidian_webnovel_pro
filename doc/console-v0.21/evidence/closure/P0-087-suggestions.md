# P0-087C 建议决策 UI

- 实现：建议卡提供接受、延后、忽略一次、不适用、转为任务五种决策；前四种只追加决策，转换使用同一 ChangePlan 原子包含任务与决策文件。
- 幂等：相同 suggestion、decision 与 resultingTaskId 的最新决策在规划阶段返回 `SUGGESTION_ALREADY_DECIDED`；重复点击同时由 ActionRunner key 防护。
- 测试：`wave8b-pages.test.ts`、`wave8b-facade.test.ts`、`suggestions.test.ts`、`transaction.test.ts`、`action-runner.test.ts`。
- 验证：五种决策、原子转换、重复确认和失败补偿相关回归及全量门禁通过。

