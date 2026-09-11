# P0-087A 任务、建议与伏笔应用门面

- 实现：`ConsoleApplication` 提供 task/suggestion/foreshadowing 的读 DTO 与预览方法，统一从当前 runtime snapshot 构造 repository/service，UI 不直接持有仓储。
- 校验：任务与伏笔锚点必须解析为对应正式实体；缺索引/缺持久化服务给出明确错误；里程碑、任务和伏笔影响报告展开关联事件。
- 测试：`wave8b-facade.test.ts` 真实 `MarkdownChangePlanner` 门面集成，`PluginBootstrapper.test.ts` 服务生命周期与注册回归。
- 验证：application 行覆盖率 99.43%、函数覆盖率 93.29%，全量门禁通过。

