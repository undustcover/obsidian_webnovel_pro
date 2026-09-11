# P0-093A 旧能力真实回归

- 日期：2026-09-11
- 状态：通过
- 候选工作树：`328e1ae884e2-dirty`
- Node：`v22.18.0`
- 插件版本文件：`package.json` / `manifest.json` / `versions.json` 均为 `0.21.9`

## 自动回归

P0-001 基线中的 55 个非 Console 测试文件全部执行，未用新 Console 测试代替旧能力验证。

```powershell
$legacyTests = Get-ChildItem tests -Recurse -Filter '*.test.ts' |
  Where-Object { $_.FullName -notmatch '[\\/]console[\\/]' -and $_.Name -notin @('artifact-verifier.test.ts','version-consistency.test.ts') } |
  ForEach-Object { Resolve-Path -Relative $_.FullName }
node .\node_modules\vitest\vitest.mjs run @legacyTests
```

- 退出码：0
- 测试文件：55/55
- 测试项：958/958
- 耗时：2.92s
- `node .\node_modules\typescript\bin\tsc --noEmit`：退出码 0
- stderr 中的磁盘读取、缓存写入、Workspace 调用失败均来自已有故障注入用例；没有失败测试。

| 旧能力 | 自动证据 | 结果 |
|---|---|---|
| 主页 | `HomepageRenderer.test.ts` | 通过 |
| 工作台/章节卡板 | `WorkbenchView.test.ts`、`ChapterOverviewView.test.ts` | 通过 |
| 章节创建、拆分、排序 | `CommandManager.test.ts`、`ChapterSplitter.test.ts`、`ChapterSorter.test.ts` | 通过 |
| 时间线 | `TimelineManager.test.ts`、`TimelineBoardRenderer.test.ts` | 通过 |
| 伏笔 | `ForeshadowingManager.test.ts` | 通过 |
| 设定 | `CharacterManager.test.ts`、`LoreOverviewView.test.ts`、`LoreSyncService.test.ts` | 通过 |
| 任务 | `TaskManager.test.ts` | 通过 |
| 沉浸写作 | `ImmersiveModeManager.test.ts`、`ImmersiveChapterListView.test.ts` | 通过 |
| 统计 | `StatisticsManager.test.ts`、`WritingStatusView.test.ts` | 通过 |
| 校对 | `ProofreadingManager.test.ts`、`ProofreadingUI.test.ts` | 通过 |
| 合并 | `ChapterMergeManager.test.ts` | 通过 |
| 模板/创建 | `template.test.ts`、`CommandManager.test.ts` | 通过 |

## 真实 Obsidian smoke 清单

必须在隔离测试 Vault 中逐项记录“入口可见、核心内容正确、代表操作成功、无 Console 依赖”。写操作仅使用测试章节。

| # | 旧能力 | 最小实机步骤 | 当前结果 |
|---:|---|---|---|
| 1 | 主页 | 打开创作主页，确认作品摘要和旧入口可用 | 待执行 |
| 2 | 工作台/章节卡板 | 打开工作台与章节卡板，切换视图并打开一章 | 待执行 |
| 3 | 创建/拆分/排序 | 创建测试章、在光标处分章、检查排序与新章 | 待执行 |
| 4 | 时间线 | 打开旧时间线，读取并编辑一条测试事件 | 待执行 |
| 5 | 伏笔 | 打开旧伏笔入口，读取并更新一条测试记录 | 待执行 |
| 6 | 设定 | 打开设定总览，进入人物详情并返回 | 待执行 |
| 7 | 任务 | 打开旧任务/写作状态，检查测试任务 | 待执行 |
| 8 | 沉浸写作 | 进入和退出沉浸模式，切换测试章节 | 待执行 |
| 9 | 统计 | 打开统计/写作状态，确认当前 Vault 数据可读取 | 待执行 |
| 10 | 校对 | 对测试段落执行校对并查看结果 | 待执行 |
| 11 | 合并 | 在测试章节副本上打开合并、保存并核对结果 | 待执行 |
| 12 | 模板/创建 | 通过旧模板创建测试章节并核对内容 | 待执行 |

## 当前限制

- 已启动本机 Obsidian，但当前会话未提供原生应用窗口控制接口。
- `obsidian` 命令未注册；直接调用已安装的 `Obsidian.exe help` 没有返回 CLI 命令输出，无法用官方 CLI 读取窗口、执行命令或截图。
- 因此没有把自动测试或“进程已启动”表述为真实 smoke 通过，也没有在未知 Vault 中执行任何写操作。

## 结论

自动旧套件无回归。真实 Obsidian smoke 发现的命令可见性和设定架构兼容缺陷均已修复并通过用户复验；P0-093A、原 P0-071 与 AC-30 已关闭，可以进入 P0-093B。

## 首轮真实 smoke 与缺陷处理

用户于 2026-09-11 在 fix2 测试 Vault 执行首轮验证：

- 通过：章节卡板、时间线、沉浸写作、写作统计、词库校对。
- 通过页面入口可达：创作主页可从设置打开；工作台、伏笔看板和任务看板可从创作主页进入。
- 缺陷：创作主页、工作台、伏笔、写作状态、创建下一章和拆分章节等命令使用 `editorCallback/editorCheckCallback`，焦点位于设置、主页或 Console 时从命令面板消失。
- 测试说明错误：拆分章节原本不是文件右键菜单项；首轮清单错误要求从右键菜单查找。
- 数据边界：`mixed-legacy/混合样本/设定/旧人物合集.md` 是故意保留的旧格式只读兼容样本，以 `#` 标题区分人物；新格式人物仍要求一人一个 Markdown，`minimal/雾港纪事/设定系统/人物/林澈.md` 是规范样本。不得自动拆分或改写 legacy 合集。

修复内容：

- 主页、工作台、章节卡板、设定总览、时间线、伏笔和写作状态命令改为全局 `callback`，离开 Markdown 编辑器后仍在命令面板显示。
- “自动创建下一章”和“在光标处拆分章节”改为始终可见；没有活动 Markdown 章节时显示明确提示，不静默消失。
- `CommandManager.test.ts` 锁定上述 9 个命令具有全局 callback，并覆盖拆分命令缺少编辑器时的反馈。

修复后验证：

- `CommandManager.test.ts` + `i18n-audit.test.ts`：26/26 通过。
- P0-001 非 Console 旧套件：55 文件、955/955 通过。
- `tsc --noEmit`：退出码 0。
- fix1 Vault：`G:\career\2026\webnovel_pro\p093a-legacy-smoke-fix1\{minimal,mixed-legacy}`。
- fix1 版本：`0.21.9`；构建身份 `328e1ae884e2-dirty`。
- 两个 Vault 的 artifact verifier 均为 `consistent`、退出码 0。
- SHA-256：`main.js E3DE550EF3F236E42C696F4D13D115F9F1E234955F2496906DE7A3A289320283`；`styles.css A5ED91AD44EFE389B190541A864B9125ED45DF3729FFFF6F27D0CD5A8E211504`；`manifest.json 772133B186DCE5816C33CE7452BBAA4F55B7AB4F0E60655B1C427DE681B11B97`。

## 第二轮真实 smoke 与设定架构修正

用户于 2026-09-11 确认 fix1 除设定空状态提示外其余项目全部通过。剩余问题不是用户理解错误：

- V0.21 正式模型是“设定分类目录 → 每个设定一个独立 Markdown 文件 → 文件内各级标题只组织该设定内容”。
- “使用 `##` 二级标题添加设定”仅属于旧版合集文件的兼容解析规则，不应继续作为新项目提示或新增写入格式。
- 旧设定管理器此前没有纳入 Console 项目配置的 `directories.lore`，导致默认 `设定系统` 可能无法被旧设定看板识别。

修正内容：

- 空状态与关系图谱提示改为“一项设定一个 Markdown 文件”，用户指南同步说明正式格式与旧合集兼容边界。
- `CharacterManager` 纳入每个 Console 项目的设定目录配置；正式实体文件具有 `type + id` 时，文件内 H2/H3 不再被误拆为多个设定。
- “添加新设定”改为在分类目录下创建独立文件，写入 V0.21 frontmatter 与永久 ID；旧合集仍可读但不再作为新增写入格式。
- 自动验证：设定与路径定向 49/49 通过；此前设定视图定向合计 50/50 通过；P0-001 非 Console 旧套件 55 文件、958/958 通过；`tsc --noEmit` 退出码 0。
- fix2 Vault：`G:\career\2026\webnovel_pro\p093a-legacy-smoke-fix2\{minimal,mixed-legacy}`。
- fix2 版本：`0.21.9`；构建身份 `328e1ae884e2-dirty`；两个 Vault 的 artifact verifier 均为 `consistent`、退出码 0。
- fix2 SHA-256：`main.js 27B3D51D9B400E4CDAC6961570CAA7CA6B66B860C69FCC2390114B81EEBE43D0`；`styles.css A5ED91AD44EFE389B190541A864B9125ED45DF3729FFFF6F27D0CD5A8E211504`；`manifest.json 772133B186DCE5816C33CE7452BBAA4F55B7AB4F0E60655B1C427DE681B11B97`。
- 用户于 2026-09-11 确认 fix2 的正式设定文件识别、文件内标题不拆卡和新增设定独立落盘全部通过；P0-093A 真实回归闭环。
