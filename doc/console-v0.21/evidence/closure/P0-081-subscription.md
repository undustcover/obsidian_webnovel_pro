# P0-081A 统一订阅接口

日期：2026-09-11

## 契约

- `ConsoleIndexRuntime.subscribe(listener)` 注册统一运行时订阅并同步发送当前状态，返回幂等可调用的 unsubscribe。
- 统一事件覆盖 `current`、`configuration`、`active-project`、`index-state`、`snapshot` 和 `cache`。
- 事件包含递增 sequence、项目 ID 列表、active project、配置诊断、索引状态和 snapshot 摘要；snapshot 只含 projectId/version/recordCount。
- 所有数组、状态、诊断和 snapshot 均为克隆或冻结值，不暴露构建中的 records、byKey、relations 等 Map/索引对象。
- `ConsoleApplication.subscribe(listener)` 是 UI 使用的单一边界，过滤非 active project 的索引事件，并折叠相同可用性结果。

## 事件顺序

- 订阅时先同步收到 `current`，使晚订阅者无需等待下一次文件事件。
- 扫描期间按 initializing 进度发布；snapshot 发布时仍保持 initializing。
- idle 中间态不直接宣告 ready；派生缓存保存成功后由 cache 事件产生唯一最终 ready。
- 缓存保存失败不会先发 ready，而是直接发布 `INDEX_CACHE_WRITE_FAILED` degraded。
- reconfigure 候选 contexts 的构建事件被隔离，只有原子替换完成后发布一次 configuration。

## 自动验证

- `subscription.test.ts` 6 项覆盖事件顺序与单次 ready、取消订阅、缓存失败最终态、inactive project 隔离、原子配置事件和只读 snapshot 摘要。
- subscription、indexing、reconfigure、recovery、ConsoleApplication 共 5 个文件、35/35 通过。
- 命令：`node node_modules/vitest/vitest.mjs run tests/console/subscription.test.ts tests/console/indexing.test.ts tests/console/reconfigure.test.ts tests/console/recovery.test.ts tests/console/ConsoleApplication.test.ts`。
- `node node_modules/typescript/bin/tsc --noEmit` 与相关文件定向 ESLint 通过。

## 集成边界

测试从 application 的 UI-facing subscribe 边界进入真实 runtime 和 EntityIndexService，证明一次初始扫描只产生一次最终 ready；p2 的扫描/retry 不会通知 active p1 的 application 订阅者，切换到 p2 后才发送其当前状态。

## 回滚点

可独立回滚 runtime/application 订阅类型、事件桥接与测试；未修改 View 生命周期、索引领域结构、缓存格式或用户 Markdown。
