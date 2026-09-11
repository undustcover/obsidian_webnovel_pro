# P0-080A 项目上下文 dispose

日期：2026-09-10

## 实现

- EntityIndexService.dispose 清空 state/snapshot listener，并拒绝销毁后注册新 listener。
- IndexCoordinator.dispose 幂等释放关联 index；dispose 后 apply 返回 undefined，增量事件不再改变 snapshot。
-- ConsoleIndexRuntime.destroy 先 dispose 每个 project context，再清空 contexts、cache errors 和 active project。
- initialize 在异步 cache/build 边界检查 context 是否已销毁，卸载后不再保存派生缓存。

## 验证

- 新增测试覆盖重复 dispose、两类 listener 零通知、销毁后增量事件无效、runtime 销毁后事件不读文件、cache remove 零调用。
- indexing 与 PluginBootstrapper 卸载相关 42 项测试通过；`tsc --noEmit` 与定向 ESLint 通过。
- ServiceRegistry 已在插件卸载时逆序调用 ConsoleIndexRuntime.destroy，因此不会注册第二套响应链。

## 回滚点

同批回滚三个 dispose 接口前需重新验证 listener 泄漏；本任务未删除任何缓存或用户 Markdown。
