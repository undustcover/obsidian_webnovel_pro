# P0-085B 焦点编辑

- 批准变更：用户于 2026-09-11 批准 `current_focus` 可空；`spec.md` 已冻结为“正式 ID 或 YAML `null`”，且 `null` 不删除 ProjectState、不清除游标。
- 实现：ProjectState 类型、解析、校验、序列化、门面和 CurrentStagePage 均支持设置/清除唯一焦点；未知 key 在规划前失败，清除计划保留旧焦点为影响目标。
- 恢复：Dashboard 将已配置但无焦点显示为“未设置”，与缺文件的“未配置”严格区分；重新读取 `current_focus: null` 可恢复无焦点状态及全部游标。
- 测试：`project-state.test.ts`、`wave8b-pages.test.ts`、`wave8b-facade.test.ts`、`dashboard.test.ts`、`transaction.test.ts`。
- 验证：合法/未知/清除/并发保护均通过；完整门禁 118 文件、1191 测试通过。

