# P0-089C 时序与恢复测试

日期：2026-09-11

## 覆盖场景

- Console 在索引前订阅：先收到 initializing，缓存持久化后只收到一次最终 ready；取消订阅后 retry 不再通知。
- 坏派生缓存：忽略不可解析缓存，以 Markdown 重建规范 snapshot 和缓存。
- 首次扫描失败：显式进入 `INDEX_SCAN_FAILED`，同一 runtime 内 retry 后恢复 ready。
- 缓存写入失败：已发布 snapshot 与搜索仍可用，状态 degraded；retry 成功后清除降级。
- runtime destroy：清理监听与项目 context，后续文件事件不产生通知。
- 既有 recovery 测试继续断言 retry 扫描失败保留旧 snapshot、rebuild 删除失败不扫描；indexing 测试继续覆盖单文件解析失败隔离。

## 自动验证

- `first-run-recovery.test.ts`：5/5 通过。
- 与 fixture、first-run、`recovery.test.ts`、`view-lifecycle.test.ts`、`indexing.test.ts` 合并运行：39/39 通过。
- type-check、ESLint、Stylelint、CSS architecture/scope、Obsidian API 与 i18n audit 全部通过。

## G-03/G-04 结论

失败不会把旧完整 snapshot 替换为空成功；坏缓存、扫描失败、缓存保存失败均存在确定状态和 retry/rebuild 恢复路径，监听在关闭后释放。

