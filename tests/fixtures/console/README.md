# Console Vault fixtures

- `minimal/`：最小新格式 Vault；故意省略 PART 与 UNIT，用于稀疏叙事层级、稳定 ID、事件/里程碑/任务/项目状态 happy path。
- `mixed-legacy/`：新 Properties 与旧章节、H2 设定、旧时间线、旧伏笔、旧限时任务混合；包含重复 ID、未知枚举、坏 Wikilink 和无 ID 记录。
- `large/`：确定性 10,000 文件生成器。默认不把 10,000 个派生 Markdown 提交到仓库；测试或 benchmark 在临时目录物化并校验 manifest/hash。

所有 fixture 都是测试数据。adapter 和首次扫描不得回写这些 Markdown。
