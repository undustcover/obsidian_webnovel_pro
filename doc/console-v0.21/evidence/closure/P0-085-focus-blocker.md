# P0-085B 停线记录：清除焦点语义

- 原因：P0-085B 要求“设置/清除焦点”，但 `spec.md` 冻结的 ProjectState 将 `current_focus` 定义为唯一且必填的非空正式 ID；现有 `ProjectStateRepository` 也按该语义拒绝空值。
- 受影响验收：AC-14、AC-16、AC-31；依赖 P0-085B 的 P0-085C、P0-086C、P0-087D、P0-088B、P0-088C 暂不能按账本勾选完成。
- 已完成的兼容部分：合法焦点更新、未知 key 拒绝、确认/并发/失败反馈均已实现并自动验证；未写入空值、sentinel，也未删除 ProjectState。
- 建议兼容方案：将 `current_focus` 明确定义为可空，序列化为 YAML `null`；保留 ProjectState 文件和 `storyline_cursors`，清除焦点只影响 Dashboard 当前焦点投影。需要同步更新 schema、领域类型、解析/渲染、仓储与测试。
- 备选方案：批准删除“清除焦点”要求，保持 `current_focus` 必填非空；不建议通过删除整个 ProjectState 实现，因为会连带丢失游标。
- 批准人：用户。
- 批准时间：2026-09-11。
- 执行结果：已采用建议方案；`current_focus` 接受正式 ID 或 YAML `null`，清除后 Dashboard 显示“未设置”，ProjectState 与多线游标保留。后续完成证据见 [P0-085-focus.md](P0-085-focus.md)。

