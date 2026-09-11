# P0-091C 核心写入 smoke（通过）

候选身份与 Vault 路径见 [P0-091-vault-setup.md](P0-091-vault-setup.md)。执行环境沿用 Windows、Obsidian 1.13.7。

## 测试对象

- 首次执行 Vault（保留现场）：`D:\Career\webnovel_pro\wave9-smoke-vaults\minimal`
- 修复复测 Vault：`D:\Career\webnovel_pro\wave9-smoke-vaults-fix1\minimal`
- 项目：`雾港纪事`
- 候选：WebNovel Assistant 0.22.0 / `328e1ae884e2-dirty`
- 安装产物：artifact verifier 已再次确认与构建目录一致
- minimal `current_focus` 已校正为规范标量 `CH-0001`，自动解析回归通过

## 首次实机结果与 stop-line

用户在 Obsidian 1.13.7 中执行后报告：EVT-0002 文件创建成功，但事件总控、唯一焦点、`protagonist` 游标及任务锚点均无法看到该实体；上下文发布报 `ENOENT`。因此 P0-091C 未通过并保持进行中。

- 事件创建审计：`AUDIT-PLAN-FD8205FA-0e13d4d1`，结果 `succeeded`；实际文件 `雾港纪事/事件数据库/EVT-0002-夜访钟楼.md` 存在，但持久化索引不含 EVT-0002。
- 上下文审计：`AUDIT-PLAN-8F1B58B2-c02b3b29`、`AUDIT-PLAN-B5F9C74E-3f111e1e`，结果均为 `compensated`、`compensationResult=restored`，没有遗留半写入文件。
- 根因一：Vault create/modify 事件可能早于 Obsidian MetadataCache 更新；索引源读取旧 frontmatter，并且刷新口仅等待任意新 snapshot，未保证受影响路径已进入索引。
- 根因二：事务 `create` 直接创建文件，未先创建 `雾港纪事/Codex上下文` 父目录。

## 修复与自动回归

- 索引源优先从刚读到的 Markdown 内容解析 frontmatter，MetadataCache 仅作回退。
- 写事务完成后按受影响路径强制刷新，拒绝与写前相同的 snapshot；不再以无关索引事件作为成功条件。
- 创建文件前逐级创建缺失父目录，并处理并发创建目录的竞争。
- 定向 31/31、完整工程 1271/1271、type-check 与全部 lint/audit 通过。
- fix1 候选已安装到新的四 Vault 矩阵，artifact verifier 一致。

## fix1 实机复测结果

每一类操作先预览并取消一次，确认显示“已取消，未写入任何文件”；随后重复预览并确认执行。

| 类别 | 操作 | 取消 | 确认 | 实际结果 |
|---|---|---|---|---|
| 事件创建 | EVT-0002 / 夜访钟楼 / protagonist | 首轮已覆盖 | 通过 | `AUDIT-PLAN-AF3DED94-0fb301f2`；成功后无需重载即可见 |
| 事件事实 | EVT-0001 planned → occurred | 首轮已覆盖 | 通过 | 首轮审计与 Markdown 已确认 |
| 唯一焦点 | CH-0001 → EVT-0002 | 首轮已覆盖 | 通过 | fix1 中 EVT-0002 可正常选择 |
| 故事线游标 | protagonist → EVT-0002 | 首轮已覆盖 | 通过 | fix1 中 EVT-0002 可正常选择 |
| 里程碑 | MLS-0001 active → completed | 首轮已覆盖 | 通过 | 首轮审计与 Markdown 已确认 |
| 创作任务 | TSK-0002 / 检查钟楼线索 / EVT-0002 | 首轮已覆盖 | 通过 | `AUDIT-PLAN-FAAC05B9-a8c9d118`；任务文件和 event anchor 正确 |
| 上下文 | 选择一个正式实体，发布 MD + JSON | 首轮已覆盖 | 通过 | `AUDIT-PLAN-38E8EA80-bfd6e051`；MD、JSON 均已创建 |

用户于 2026-09-11 在 Obsidian 1.13.7 确认：除事件总控显示一条时间提示外，其余事项全部正常。该提示经检查是 EVT-0002 没有 `story_time` 时被误写成“不同历法”；数据本身正确。判定已修正为 `STORY_TIME_NOT_COMPARABLE`，只有双方均有明确且不同的 calendar 才报告跨历法，新增回归测试后完整工程 1272/1272 通过。

## 待核验

- 每个 Modal 均展示文件变化、字段差异、风险和影响：通过
- busy/success/error/cancel 反馈清晰且按钮恢复：通过
- 确认后的 Markdown、上下文 JSON、auditId：已读取并核验
- 未触碰真实用户稿件：是
