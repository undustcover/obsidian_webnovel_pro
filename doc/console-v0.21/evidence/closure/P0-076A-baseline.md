# P0-076A 问题复现基线

状态：经批准变更  
记录日期：2026-09-10  
仓库 commit：`328e1ae884e214ffcff16811ef0c9840a887d5c1`（工作树存在会影响候选身份的既有未提交修改）

## 已冻结输入

- 测试 Vault：`D:\Career\test_20260910`
- 候选插件目录：`D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant`
- 插件 ID：`web-novel-assistant`
- 插件版本：`0.22.0`
- `community-plugins.json` 已启用 `web-novel-assistant`
- `data.json` 中 `consoleProjects: []`、`workspaceFolders: []`

候选目录与当前仓库产物的 SHA-256 相同：

| 文件 | SHA-256 |
|---|---|
| `manifest.json` | `D6E2C8555B8AEB8BBC3DDFDF36889AA23D8007A8D19B1B8FC7463D2703472FBB` |
| `main.js` | `8EB3834DB0A97ACF85E5A9C7C17FC0C8A7929AC61A671BF7FD26762810727658` |
| `styles.css` | `ED4BCB079E50E05745D98FE2534E299F96EDB5895696C5E62DB9FD0C553BFA95` |

以上只证明磁盘候选文件一致，不证明 Obsidian 运行时实际加载了该目录。Obsidian 全局 Vault 注册信息已确认 `D:\Career\test_20260910` 当前处于打开状态。

## 安装目录校正

首次检查发现测试 Vault 把完整开发仓库安装在 `.obsidian/plugins/obsidian-webnovel-assistant-main`：共 20,565 个文件、244.18 MiB，其中 `node_modules` 174.25 MiB、`.git` 30.80 MiB、`assets` 29.67 MiB。该目录名也与 manifest ID `web-novel-assistant` 不一致。

2026-09-10 已进行可恢复校正：

- 原目录整体移至 `D:\Career\test_20260910\.codex-backups\obsidian-webnovel-assistant-main-before-minimal-install-20260910`，未删除任何文件。
- 正确目录建立为 `D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant`。
- 新目录仅包含 `main.js`、`styles.css`、`manifest.json` 与保留原设置的 `data.json`，共 4 个文件、1.336 MiB。
- 当前源码 `type-check` 通过；完整测试 105 个文件、1323 项全部通过。
- 当前源码重新生成的压缩 `main.js` 为 1,136,690 bytes；相比 3.9.4 的 978,710 bytes 增加约 16.1%，不构成 244 MiB 的主要来源。

## 待执行的真实复现步骤

1. 用 Obsidian 打开 `D:\Career\test_20260910`，记录 Obsidian 版本、系统主题、缩放和 Leaf 宽度。
2. 在“第三方插件”中确认已启用插件 ID `web-novel-assistant`，并通过运行时诊断或开发者工具确认实际加载目录及插件版本。
3. 执行命令“打开小说控制台”。
4. 记录顶部索引状态及正文区域；预期复现为 `索引 ERROR`，且页面没有项目配置、重试或恢复入口。
5. 保存完整窗口截图为 `P0-076A-01-console-error.png`。
6. 保存与本次打开动作对应的插件控制台日志为 `P0-076A-console.log`，不得包含用户正文或隐私数据。
7. 关闭 Console 后重新打开一次，确认结果可重复。
8. 由另一位执行者依据本节独立复核，并在下表签名。

## 实际结果

| 项目 | 结果 |
|---|---|
| 真实 Obsidian 至少复现一次 | 用户确认 0.22.0 已在测试 Vault 完成加载；原始 ERROR 未补截图复现 |
| 实际加载插件目录 | `D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant`（用户确认校正后已加载） |
| 实际加载插件版本/构建身份 | 版本 0.22.0；构建身份功能尚未实现 |
| Console 状态 | 未确认 |
| 恢复入口 | 未确认 |
| 截图编号 | 待生成 `P0-076A-01-console-error.png` |
| 控制台日志 | 待生成 `P0-076A-console.log` |
| 第二执行者复核 | 未执行 |

## 已知版本漂移风险

用户已明确：`D:\Career\stellar abyss\.obsidian\plugins\web-novel-assistant` 的 3.9.4 是原版对照，不属于本轮修改或部署范围。当前唯一目标是测试 Vault 内的 0.22.0 候选。

## 阻塞与变更记录

- 原因：Obsidian 进程和测试 Vault 打开状态已经确认，用户随后确认校正后的 0.22.0 已完成加载；当前会话仍没有可访问的 Obsidian 原生窗口，因此无法取得截图、控制台日志和自动化独立复核。
- 触发规则：`v0.21_task.md` 强制停线条件 4。
- 受影响 AC：AC-01、AC-04、AC-06、AC-08、AC-12～16、AC-18、AC-22～25、AC-28、AC-30、AC-31；这些 AC 的真实环境或 UI 可达证据均不能据此判定通过。
- 后续影响：用户明确要求继续后续工作；P0-076A 按“经批准变更”关闭，缺失的截图/日志不得被引用为已存在的真实证据。
- 兼容方案：不修改 schema、状态机、业务代码、用户 Markdown 或现有验收状态；3.9.4 原版保持不变；测试 Vault 的错误安装目录已移至可恢复备份，0.22.0 使用标准插件 ID 目录和最小发布文件。
- 批准人：用户（确认 0.22.0 完成加载并要求继续下步工作）。
- 批准时间：2026-09-10，本次会话。

## 本次命令与结果

- 读取测试 Vault 的 `community-plugins.json`、插件 `data.json` 和 `manifest.json`：成功。
- 对测试 Vault 候选目录与仓库根目录的 `main.js`、`styles.css`、`manifest.json` 计算 SHA-256：三项一致。
- 读取 Obsidian 全局 Vault 注册信息及进程命令行：成功，确认 Obsidian 正在运行且测试 Vault 标记为打开。
- 检查可用桌面应用窗口：自动化接口未返回 Obsidian 窗口，无法操作或截图。
- 当前源码执行 TypeScript 检查及完整 Vitest：均通过；105 个测试文件、1323 项测试通过。
- 生成当前源码的压缩候选 bundle 并部署最小安装目录：成功。

## 回滚点

本任务未修改业务代码、配置、构建产物或用户 Markdown。若需撤销本记录，只需回滚本证据文件及账本中 P0-076A 的状态/完成记录。
