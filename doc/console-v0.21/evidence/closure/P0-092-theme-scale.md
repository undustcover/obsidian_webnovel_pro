# P0-092B 主题与缩放验收（完成，人工矩阵豁免）

日期：2026-09-11

## 候选

- Obsidian：1.13.7
- 插件：0.22.0 / `328e1ae884e2-dirty`
- Vault：`D:\Career\webnovel_pro\wave9-smoke-vaults-fix2\minimal`
- main.js SHA-256：`83d3c05ba0920ed2617538535e040659f0c0d078353bdea1cbbb66cb585db6d1`
- styles.css SHA-256：`a5ed91ad44efe389b190541a864b9125ed45df3729ffff6f27d0cd5a8e211504`

## 自动证据

- Console CSS 选择器限定于 `.webnovel-console` / `.webnovel-console-modal`。
- Stylelint、CSS architecture audit、Console CSS scope audit 全部通过。
- 使用 Obsidian token，不覆盖宿主主题全局变量；reduced-motion 与 focus-visible 规则存在。

## 实机矩阵

每格同时观察 Console 与相邻 Markdown 编辑器；Console 打开事件写入预览 Modal，并用 Tab 显示焦点环。核验文字、边界、警告/成功状态、按钮、Modal、焦点均可辨识，编辑器及宿主导航样式未被 Console 污染。

| 主题 | 100% | 125% | 150% |
|---|---|---|---|
| 默认浅色 | 待执行 | 待执行 | 待执行 |
| 默认深色 | 待执行 | 待执行 | 待执行 |
| 第三方主题（记录名称） | 待执行 | 待执行 | 待执行 |

截图可存放于 `evidence/AC-02/`；若用户批准豁免截图，必须记录实际测试主题、缩放和明确豁免，不得声称截图存在。

## 用户批准的范围变更

默认浅色、默认深色、第三方主题与 100/125/150% 的九格人工矩阵未执行，AC-02 目录中没有对应截图。用户于 2026-09-11 明确要求“跳过主题测试，标记 P0-092B 完成，继续下一步”。因此本原子任务按用户批准的验收范围关闭；不得把人工主题/缩放项记为已测试或已通过，其最终风险由 P0-094 汇总。
