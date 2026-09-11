# P0-079D 设置页基础配置体验

日期：2026-09-10

## 实现

- 设置页默认显示项目卡片，基础字段包括项目 ID、项目代码、根目录和七类目录别名。
- 支持新增、删除、撤销到最近一次成功保存状态及显式保存。
- 高级 JSON 保留在默认折叠的 details 中；“应用 JSON”只更新基础表单，不直接保存。
- 基础表单与高级 JSON 共用 `ConsoleProjectsSettingsModel` 和现有 normalize 入口，不会生成两套配置语义。
- 字段错误或重复 ID/root 时不调用 persist；磁盘保存失败会恢复旧 `consoleProjects`。

## 自动验证

- settings model 6 项测试覆盖增删、非法输入零保存、重复诊断、高级 JSON、撤销和失败回滚。
- P0-079 相关表单、向导、选择器、路由、应用与 SettingsManager 共 8 个文件、51 项测试通过。
- `tsc --noEmit`、完整 ESLint、Stylelint、CSS architecture/scope audit、i18n audit、Obsidian API audit 均通过；API audit 仅有既有建议，无错误。

## 真实 Obsidian 验收

- 候选构建：`0.22.0 / 328e1ae884e2-dirty / 2026-09-10T08:30:20.073Z`。
- artifact verifier 对构建目录与 test_20260910 安装目录返回 consistent，三项 SHA-256 一致。
- 用户确认 Console 当前项目选择器、设置页项目卡片以及默认折叠的高级 JSON 均显示正常。

## 回滚点

可回滚 SettingsTab 项目区、settings model、i18n 与 settings CSS；不删除已保存配置或用户 Markdown。
