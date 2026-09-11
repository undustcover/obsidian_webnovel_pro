# P0-079B 首次配置向导

日期：2026-09-10

## 实现与安全边界

- `OnboardingPage` 仅在 Console availability 为 `unconfigured` 时显示。
- 根目录输入提供 Vault 已加载文件夹候选；项目 ID、项目代码、根目录及七类目录均为原生可键盘操作控件。
- 保存调用插件现有 `saveSettings()` 边界；磁盘保存失败会恢复保存前的 `consoleProjects` 数组。
- 取消只改变当前向导会话状态，不调用保存，不创建目录，不写 Markdown。
- 首次保存后在当前页显示“项目配置已保存。”；运行时无重载重配置属于后续 P0-080B。

## 自动验证

- 向导 7 项测试覆盖：原生表单/按钮、候选去重、非法提交零保存、路径规范化、取消零写入、保存失败反馈/重试、磁盘失败设置回滚。
- 连同 form model 与 project config 共 21 项相关测试通过；`tsc --noEmit` 通过。
- 新增/接线代码定向 ESLint 通过；Console CSS 定向 Stylelint 通过。
- 候选包三项产物与 `test_20260910` 安装目录 SHA-256 一致，artifact verifier 退出码 0。

## 真实 Obsidian 验收

- 候选构建：`0.22.0 / 328e1ae884e2-dirty / 2026-09-10T08:11:25.399Z`。
- 首轮验收发现保存按钮位于 form 外，点击未触发保存；取消路径正常。该接线问题已修复并增加 submit 回归测试。
- 用户重新加载修复候选并确认显示“项目配置已保存”。
- 随后只读核对插件 `data.json`：`consoleProjects[0]` 为 `project-1 / NOVEL-1 / 测试小说`，七类目录与数值均为规范化默认值；`workspaceFolders` 仍为空。

## 回滚点

可回滚 OnboardingPage、NovelConsoleView 接线与相关 CSS；保存失败路径会自动恢复旧设置，不删除用户 Markdown。
