# Wave 3 自动化证据

- 日期：2026-09-09
- 范围：P0-030..P0-039
- 环境：Windows，Node v24.19.0
- 说明：当前执行环境未暴露 `npm` 命令，因此使用 `node_modules/.bin` 与 Vitest CLI 执行 package scripts 的等价底层命令。

## 结果

| 检查 | 结果 | 稳定断言 |
|---|---|---|
| TypeScript | 通过，退出码 0 | `tsc --noEmit` 无诊断 |
| 全量测试 | 通过，退出码 0 | 82 个文件、1031 项测试通过 |
| Coverage | 通过，退出码 0 | application 99.75/84.61/100/99.75；persistence 98.00/85.01/96.72/98.00；均越过 85/80/90/85 闸门 |
| ESLint | 通过，退出码 0 | 0 error、0 warning |
| CSS/作用域审计 | 通过，退出码 0 | 83 个模块、1472 条规则；Console selector scope audit 通过 |
| Obsidian API 审计 | 通过，退出码 0 | 无 error；仅保留既有剪贴板与限界索引枚举建议 |
| i18n 审计 | 通过，退出码 0 | 1101 个 key 同步 |
| 发布构建 | 通过，退出码 0 | `main.js` 与 `styles.css` 已重新生成 |

覆盖率数字顺序为 Statements / Branches / Functions / Lines。

## 核心创作路径断言

- 叙事树仅使用显式层级关系，可越过缺省层级；孤立与环均输出诊断，节点仍保持可达。
- 正文投影只组合章节元数据与修订，不把 body 当策划摘要或检索字段；正文页提供相邻编辑器与沉浸写作入口。
- 当前阶段 repository 对缺文件只返回空态，创建必须先形成 ChangePlan；一个 `current_focus` 可与多条故事线 cursor 共存。
- ChapterWorkspace 使用同一不可变 snapshot 聚合十类资料；缺关系不会让页面失败。
- 章节字段写入只允许白名单，`body` 与未知字段拒绝；所有修改先进入统一预览并显式确认。
- ContextPlanner 的关系和事件前置扩展均有深度上限；候选、历史、废弃、测试默认排除，手动规则不会绕过归档阻断。
- Context 预览公开纳入原因、关系、治理状态、知识边界、未揭示与冲突标记，手动选择会重新规划。
- Markdown 与 JSON 严格遵循冻结 Schema，并作为同一事务发布；第二个文件写入失败时，前一个文件逆序补偿，上一版双文件保持不变。
- Dashboard 固定呈现焦点、游标、章节上下文、健康计数以及“现在/遗漏/即将/稍后”行动槽位。

## 尚未关闭的验收

- AC-04 仍需真实 Obsidian 页面审查；自动路由与叙事/正文分离测试已具备。
- AC-06 仍需 Wave 5 总控功能和手工验收；Wave 3 仅完成 Dashboard 基础骨架。
- AC-14 的状态 repository 已完成，正式游标推进不变量由 P0-046 在 Wave 4 补齐。
- AC-30、AC-31 继续保持进行中，待兼容烟测与后续领域命令全部接入后关闭。
