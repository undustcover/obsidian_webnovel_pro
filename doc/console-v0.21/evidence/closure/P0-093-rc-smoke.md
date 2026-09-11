# P0-093D 候选包关键路径复验

- 日期：2026-09-11
- 状态：通过
- 执行者：用户
- 用户结论：`测试通过`
- 环境：Windows；沿用同日已记录的 Obsidian 1.13.7 环境，本轮回复未重复报告版本
- 候选版本：`0.21.9`
- 候选提交：`c33b2f4eb1a69decfc9c54e38bfa655c4c98e0fc`
- 候选目录：`G:\career\2026\webnovel_pro\p093-release-candidate-0.21.9-c33b2f4`

## 用户执行结果

用户按 P0-093D 方案使用候选目录原封不动的四套 Vault 完成真实 Obsidian 复验，并统一确认通过：

1. `fresh`：首次向导、仅通过 UI 配置 `新作`、进入 ready、索引状态刷新通过。
2. `minimal`：仪表盘、阶段、任务、事件、人物关键路由通过；事件预览取消零写入，确认后安全创建 `EVT-0002-候选包复验事件.md`，无需重载即可见。
3. 命令入口：创作主页、写作工作台、自动创建下一章、光标拆章、伏笔看板、写作实时状态面板的候选包入口通过。
4. `legacy-workspace`：旧 `workspaceFolders` 自动识别，章节、人物、时间线只读兼容通过。
5. `mixed-legacy`：预置坏派生缓存被忽略并重建，混合旧资料可读，健康诊断不阻断导航，重启恢复通过。

## 测试后机器核验

| 核验 | 结果 |
|---|---|
| 四个安装目录 vs 候选目录 | 4/4 `consistent`，退出码 0，版本均为 0.21.9 |
| `main.js` | `3397FBB81AB4CF7D257C38479C63AB8C20DCAF49843B370FA24EAF6CED9DE14B` |
| `styles.css` | `A5ED91AD44EFE389B190541A864B9125ED45DF3729FFFF6F27D0CD5A8E211504` |
| `manifest.json` | `772133B186DCE5816C33CE7452BBAA4F55B7AB4F0E60655B1C427DE681B11B97` |
| mixed 坏缓存恢复 | 合法 `console.index.v1`，10 条记录 |
| mixed 原有 Markdown | 8/8 SHA-256 不变 |
| legacy-workspace 原有 Markdown | 3/3 SHA-256 不变 |
| minimal 安全写入 | `EVT-0002-候选包复验事件.md` 存在，ID、标题与规范 frontmatter 正确 |

测试过程中另生成规范的 `作品信息.md` 与 Vault 根部 `创作主页.md`；它们是用户执行主页/项目流程产生的新文件，不是旧 Markdown 的迁移或改写。

Obsidian CLI 未注册到系统 PATH，无法补取运行期控制台日志；候选现场、缓存、产物与 Markdown 哈希均由文件级校验完成。此前 P0-092 已批准豁免的主题九宫格、截图及全键盘/减少动画实机矩阵仍按原范围变更披露，本任务不将其表述为已补测。

## 结论

P0-093C 固化的候选包通过首次使用、安全写入、错误恢复、旧配置/旧能力和重启恢复的真实 Obsidian smoke。Gate A～D 技术项放行，P0-093D 完成。
