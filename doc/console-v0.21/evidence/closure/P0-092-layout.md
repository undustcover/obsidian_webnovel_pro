# P0-092A 宽中窄 Leaf 验收（通过，截图豁免）

日期：2026-09-11

## 候选与环境

- Obsidian：1.13.7
- 插件：0.22.0 / `328e1ae884e2-dirty`
- Vault：`D:\Career\webnovel_pro\wave9-smoke-vaults-fix2\minimal`
- 构建时间：`2026-09-11T08:26:25.329Z`
- main.js SHA-256：`83d3c05ba0920ed2617538535e040659f0c0d078353bdea1cbbb66cb585db6d1`

## 自动证据

- `layout.test.ts`：759→narrow、760→medium、1179→medium、1180→wide；连续 ResizeObserver 更新与 destroy 断开通过。
- `accessibility.test.ts`：导航、搜索、详情、表单使用原生键盘控件和标签；状态不只靠颜色；reduced-motion 规则通过。
- 完整工程：125 个测试文件、1272/1272 项通过。
- Stylelint、Console CSS scope、CSS architecture、Obsidian API、i18n、错误反馈审计全部通过。

## 实机结论与证据豁免

| 文件 | Leaf 实测宽度 | 布局 | 页面 | 核验 |
|---|---:|---|---|---|
| `AC-03/01-narrow-before-760.png` | 759.x 或更接近 760 的下侧值 | narrow | 当前阶段 | 用户实测通过；截图豁免、文件不存在 |
| `AC-03/02-medium-at-760.png` | 760.x | medium | 当前阶段 | 用户实测通过；截图豁免、文件不存在 |
| `AC-03/03-medium-before-1180.png` | 1179.x | medium | 事件总控 | 用户实测通过；截图豁免、文件不存在 |
| `AC-03/04-wide-at-1180.png` | 1180.x | wide | 事件总控 | 用户实测通过；截图豁免、文件不存在 |

用户于 2026-09-11 报告布局验收通过，随后明确要求跳过截图提交并将 P0-092A 标记完成。因此 P0-092A 按批准的证据范围关闭；截图仍如实记录为缺失，不伪造、不补写虚假路径。AC-03 的最终证据充分性由 P0-094 按该豁免决定复核。
