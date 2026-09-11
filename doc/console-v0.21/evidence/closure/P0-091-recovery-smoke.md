# P0-091D 兼容与恢复 smoke（通过）

日期：2026-09-11

## 固定候选

- Obsidian：1.13.7
- 插件：0.22.0 / `328e1ae884e2-dirty`
- Vault 根目录：`D:\Career\webnovel_pro\wave9-smoke-vaults-fix2`
- artifact verifier：构建目录与 `mixed-legacy` 安装目录一致，exit 0
- 自动回归：125 个测试文件、1272/1272 项通过

## 故障注入

`mixed-legacy/.obsidian/plugins/web-novel-assistant/console-index-v1-project-1.json` 已预置非法 JSON：`{broken-cache-for-P0-091D`。这是派生缓存，不是用户 Markdown；插件应忽略它、从 8 个 Markdown 重建规范索引并覆盖坏缓存。注入前已记录 legacy-workspace 3 个、mixed-legacy 8 个 Markdown 的 SHA-256 基线，实测后重新计算比较。

## 待执行矩阵

| 场景 | 预期 | 实际 |
|---|---|---|
| legacy-workspace | 旧 `workspaceFolders` 自动映射项目，章节/人物/时间线可读，无自动迁移写入 | 用户在 Obsidian 1.13.7 验证通过 |
| mixed-legacy + 坏缓存 | Console 正常进入 ready；规范与 legacy 记录同时可读；坏派生缓存被规范 JSON 替换 | 用户验证通过；缓存已变为合法 `console.index.v1`，包含 10 条规范/legacy 记录 |
| 状态重启恢复 | 关闭并重新打开 Vault 后，项目、焦点、游标和索引结果一致 | 用户验证通过 |
| Markdown 不变 | 两个兼容 Vault 的 11 个 Markdown hash 与基线一致 | 逐文件 SHA-256 比较 11/11 一致 |

## 结论

最低可用场景 8～9 在真实 Obsidian 1.13.7 中通过。坏缓存只作为派生数据被覆盖，legacy 和 mixed-legacy Markdown 未被迁移或改写；项目、焦点、游标及索引在重启后恢复正确。
