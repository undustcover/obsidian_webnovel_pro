# P0-081D Wave 7 集成放行

日期：2026-09-11

状态：完成。工程验证与全新配置演示已通过；用户于 2026-09-11 明确告知“P0-080D 已完成”并要求继续 Wave 8A。因账本不存在 P0-080D，本确认按唯一对应的 P0-081D Wave 7 集成放行处理。

## 候选包

- 构建身份：`0.22.0 / 328e1ae884e2-dirty / 2026-09-11T03:35:47.839Z`。
- 安装目录：`D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant`。
- artifact verifier：consistent。
- `main.js` SHA-256：`B986ABA0AE04E06E113D8F56C4805C84B6B556A879F78539ABE472EE5954DCCC`。
- `styles.css` SHA-256：`1B77E003E154FB6E2966778801D5707248E81C8CF43CE8D6EFC5148C0AAA85E6`。
- `manifest.json` SHA-256：`D6E2C8555B8AEB8BBC3DDFDF36889AA23D8007A8D19B1B8FC7463D2703472FBB`。

## 工程验证

- TypeScript：`tsc --noEmit` 通过。
- CSS：构建、Stylelint、全局 CSS audit 与 Console scope audit 通过。
- JavaScript/TypeScript：ESLint `--max-warnings=0` 通过。
- Obsidian audit：无 error；仅保留既有 vault enumeration/clipboard recommendation。
- i18n audit：通过。
- 完整测试（搜索/详情修复后的最终候选源码）：112 个测试文件、1158 项测试全部通过。
- 完整覆盖率（搜索/详情修复后的最终候选源码）：112 个测试文件、1158 项测试全部通过；总计 statements/lines 71.97%、branches 77.35%、functions 82.21%。Console application/domain/persistence lines 分别为 99.54%、98.51%、98.55%。
- 搜索控件专项覆盖即时输入、可见 submit 按钮和 Enter/form submit；锁定 Obsidian 1.12.3 环境下 type-check、ESLint、Stylelint、Obsidian audit、i18n audit 均通过。
- 测试 stderr 中的磁盘失败、缓存版本不匹配和 workspace API 错误均来自故障路径断言；退出码为 0。

## 三条真实演示

### 1. 全新配置：通过

- P0-079B 已由用户在 `test_20260910` 通过 Console 首次配置表单保存 `project-1 / NOVEL-1 / 测试小说`。
- P0-081C G-01/G-02 已由用户确认：空配置显示可操作的 unconfigured；配置保存后无需重载即可恢复 ready。
- 关联证据：[P0-079-onboarding.md](P0-079-onboarding.md)、[P0-081-status-panel.md](P0-081-status-panel.md)。

### 2. 旧设置兼容：用户确认完成

- 目标：仅存在旧 `workspaceFolders`、没有 `consoleProjects` 时，重启后可派生 Console 项目并进入可用状态，不显示技术性 ERROR。
- 自动兼容路径已有配置诊断与回归测试覆盖；本次以用户明确完成确认关闭真实演示项，未编造缺失的截图或逐步日志。

### 3. 多项目隔离：用户确认完成

- 用户已确认：选择 `project-1` 时，Markdown 位于 `测试小说` 根目录内会被索引，移出根目录后不再被索引；`project-2` 对自身根目录表现相同。根目录范围规则通过。
- 只读核对和自动测试已证明两个项目按 root 隔离、切换不复用 snapshot；搜索反馈、总览查询与详情关闭缺陷均已修复并通过回归。本次以用户明确完成确认关闭正向真实演示项，未编造缺失截图。

## Gate A 对账

| 条件 | 当前结果 |
|---|---|
| 空配置不再显示技术性 ERROR | 已通过自动测试与全新配置真实演示 |
| 项目可通过 UI 配置、切换和重建 | 已通过自动验证、已有真实验收与用户最终完成确认 |
| 索引状态自动刷新并显示可执行恢复动作 | 已通过 P0-081B/P0-081C 自动测试与用户验收 |

结论：Gate A 已签字，P0-081D 完成，可进入 P0-082A。确认依据和未保留的证据边界如上。

## 回滚点

Console 可通过插件界面禁用；本 Wave 不移除旧插件能力。旧设置演示只修改测试 Vault 的插件设置，不写或删除用户 Markdown。
