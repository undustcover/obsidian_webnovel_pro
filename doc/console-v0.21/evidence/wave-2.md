# Wave 2 自动化证据

- 日期：2026-09-09
- 范围：P0-020..P0-028
- 环境：Windows，Node v24.19.0
- 说明：当前执行环境未暴露 `npm` 命令，因此使用 `node_modules/.bin` 与 Vitest CLI 执行 package scripts 的等价底层命令。

## 结果

| 检查 | 结果 | 稳定断言 |
|---|---|---|
| TypeScript | 通过，退出码 0 | `tsc --noEmit` 无诊断 |
| 全量测试 | 通过，退出码 0 | 72 个文件、1007 项测试通过 |
| Coverage | 通过，退出码 0 | application 99.22/91.48/100/99.22；persistence 97.71/80.72/94.59/97.71；均越过 85/80/90/85 闸门 |
| CSS 架构审计 | 通过，退出码 0 | 83 个模块、1463 条规则；Console selector scope audit 通过 |
| ESLint | 通过，退出码 0 | 0 error、0 warning |
| Obsidian API 审计 | 通过，退出码 0 | 仅保留基线剪贴板建议与 Wave 1 限界索引枚举建议 |
| i18n 审计 | 通过，退出码 0 | 1101 个 key 同步 |

覆盖率数字顺序为 Statements / Branches / Functions / Lines。

## 安全写入断言

- 未注册写命令按高风险 fail closed，不能形成快速执行旁路。
- 高风险 ChangePlan 必须使用与 planId 绑定的一次性 token；重复提交被拒绝。
- 所有目标在首笔写入前完成 path、mtime、content hash 和目标占用校验；冲突场景写次数为 0。
- create/modify/delete/move 按稳定路径执行；注入中途失败后逆序补偿。
- 补偿期间发现作者外部修改时停止覆盖，返回运行期人工恢复材料；审计文件不保存正文。
- 成功写入等待不可变索引新版本后才返回。

## UI 与兼容断言

- `webnovel-novel-console` 仅桌面端注册，旧 Status/Workbench 等 view 与命令仍存在。
- Router 覆盖计划中的全部 P0 路由，`narrative/chapters` 与 `manuscript` 保持独立。
- Leaf 容器断点为 `<760 / 760..1179 / >=1180`，ResizeObserver 在关闭时断开。
- Console CSS 普通选择器全部以 `.webnovel-console` 或 `.webnovel-console-modal` 限界。
- 预览 Modal 展示文件、字段、关系、风险、警告及完整 ImpactReport 类别；确认按钮只提交一次。

## 仍需手工证据

Wave 2 代码任务完成，但以下 AC 按验收矩阵规则保持“进行中”：AC-01 的真实 Obsidian 分屏复现、AC-02 的主题无污染截图、AC-03 的 760/1180 Leaf 截图，以及 AC-04/06 的后续业务页面审查。AC-31 还需 Wave 4/5 的实际领域命令接入后最终关闭。
