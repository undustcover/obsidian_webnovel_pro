# Console Vault fixtures

- `minimal/`：最小新格式 Vault；故意省略 PART 与 UNIT，用于稀疏叙事层级、稳定 ID、事件/里程碑/任务/项目状态 happy path。
- `mixed-legacy/`：新 Properties 与旧章节、H2 设定、旧时间线、旧伏笔、旧限时任务混合；包含重复 ID、未知枚举、坏 Wikilink 和无 ID 记录。
- `first-run/`：Wave 9 首次使用矩阵生成器；覆盖空配置、旧 workspace、非法配置、多项目和零文件项目，不包含派生缓存。
- `legacy-workspace/`：只有旧章节、H2 设定和旧时间线的只读兼容 Vault，用于与 mixed-legacy 分离验收。
- `large/`：确定性 10,000 文件生成器。默认不把 10,000 个派生 Markdown 提交到仓库；测试或 benchmark 在临时目录物化并校验 manifest/hash。

所有 fixture 都是测试数据。adapter 和首次扫描不得回写这些 Markdown。

执行 `pnpm exec tsx scripts/prepare-console-smoke-vaults.ts <空目录>` 可生成 fresh、legacy-workspace、minimal、mixed-legacy 四个隔离 Vault；脚本把同一份 `main.js/styles.css/manifest.json` 安装到每个 Vault，并生成 hash/数量清单。
