# P0-078A Console 可用性状态契约

日期：2026-09-10

## 契约

- 五态固定为 `unconfigured`、`initializing`、`ready`、`degraded`、`error`。
- 每个状态均携带稳定 `code`、用户消息、`retryable` 和建议动作。
- 建议动作固定为 `configure`、`retry`、`rebuild`。
- `unconfigured` 是可操作的首次使用状态，不是技术错误。
- 已生成零记录 snapshot 的合法项目是 `ready`，不是 `unconfigured` 或 `error`。
- `degraded` 必须保留 snapshot 版本、记录数和失败路径；`error` 可携带技术详情但不得替代用户消息。

## 验证

- `tests/console/availability-state.test.ts` 覆盖五态常量、错误码唯一性、判别联合穷尽消费、JSON 序列化、空配置和零记录项目边界。
- 本任务不改变索引算法，也不在 UI 渲染新状态；运行时诊断与应用映射分别由 P0-078B/C 接入。

## 回滚点

状态类型、常量、工厂函数、导出和对应测试同批回滚；消费者接入后不得单独移除契约。
