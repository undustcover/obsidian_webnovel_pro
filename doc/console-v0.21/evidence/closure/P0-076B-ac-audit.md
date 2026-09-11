# P0-076B 受影响 AC 审计

日期：2026-09-10  
范围：AC-01、04、06、08、12～16、18、22～25、28、30、31  
结论：17 条均尚未同时具备“领域实现、UI 可达、真实环境”三层证据，因此不得标为“通过”。

## 审计表

| AC | 领域实现证据 | UI 可达证据 | 真实环境证据 | 审计后状态 | 缺口/后续任务 |
|---:|---|---|---|---|---|
| AC-01 | 不适用 | `NovelConsoleView` 与 View 注册已有自动测试 | 仅确认 0.22.0 成功加载；缺分屏记录 | 进行中 | P0-091/P0-092 |
| AC-04 | 路由与导航常量存在 | 导航可达，但叙事六路由共用同一棵树，多个业务页回落到无类型过滤列表 | 缺真实页面审查 | 进行中 | P0-082/P0-084 |
| AC-06 | Dashboard 查询存在 | 总控导航存在，但各入口尚无独立职责 renderer | 缺真实页面审查 | 进行中 | P0-083 |
| AC-08 | Character/Item center 查询及事件 DTO 已实现 | 事件详情有部分控件；人物/道具路由仍落入通用列表，中心详情未完整接线 | 缺三类入口实测 | 进行中 | P0-084C |
| AC-12 | 三类事件状态和命令已实现并有单测 | 事件详情存在三个独立 select/预览入口 | 缺候选包真实修改记录 | 进行中 | P0-086B/P0-091C |
| AC-13 | 里程碑条件求值与推进规划已有测试 | 页面仅列出里程碑，未展示条件证据或推进动作 | 缺真实推进记录 | 进行中 | P0-086C |
| AC-14 | ProjectState、唯一焦点与多线游标有 repository/不变量测试 | Dashboard 仅只读展示；无焦点编辑和游标推进入口 | 缺重载恢复实测 | 进行中 | P0-085B/C |
| AC-15 | 当前事件建议具备零写入测试 | 无建议当前事件/选择目标的完整 UI | 缺真实零自动推进证明 | 进行中 | P0-085C |
| AC-16 | ImpactReport 与 progression 服务已有测试 | ChangePreviewModal 已存在，但游标/里程碑推进没有可达入口 | 缺三类推进真实记录 | 进行中 | P0-085C/P0-086C |
| AC-18 | CreativeTaskRepository 已实现并有写入测试 | 当前任务路由回落通用列表，无创建 TSK 表单 | 缺真实创建记录 | 进行中 | P0-087A/B |
| AC-22 | SuggestionService/Commands 有决策和补偿测试 | 无建议决策 UI | 缺真实转任务记录 | 进行中 | P0-087A/C |
| AC-23 | 伏笔 adapter、规则和命令服务已有测试 | 无锚点操作 UI | 缺真实锚点操作记录 | 进行中 | P0-087A/D |
| AC-24 | ContextPlanner 有章节/事件/任务/人物计划测试 | ContextPage 可选择目标并预览发布，但未形成四类目标的 UI 行为矩阵 | 缺真实预览记录 | 进行中 | P0-090A/B/P0-091C |
| AC-25 | Context schema 与策略字段已有测试 | ContextPage 展示原因、权威、生命周期、范围、复核和手动状态 | 缺真实键盘/内容审查 | 进行中 | P0-090A/P0-092C |
| AC-28 | 健康规则与第 20 章 fixture 已实现 | HealthPage 有分类过滤，但无 mixed fixture 的真实定位证据 | 缺真实诊断记录 | 进行中 | P0-091D |
| AC-30 | 旧功能自动测试基线通过 | 旧入口仍注册 | 原 smoke 清单未完成 | 进行中 | P0-093A |
| AC-31 | ChangePlan、确认令牌、事务与高风险命令测试存在 | 已接线入口使用 ChangePreviewModal，但多项 P0 写命令仍不可达 | 缺候选包写入/取消实测 | 进行中 | P0-088B/P0-090B/P0-091C |

## 原状态对照

- 原为“进行中”，保持不变：AC-01、AC-04、AC-06、AC-30、AC-31。
- 原为“通过”，本次校正为“进行中”：AC-08、AC-12、AC-13、AC-14、AC-15、AC-16、AC-18、AC-22、AC-23、AC-24、AC-25、AC-28。
- 未删除、合并、弱化或改写任何 AC 语义。

## 静态接线证据

- `src/console/ui/NovelConsoleView.ts` 仅为 overview、manuscript、narrative、context、health、milestones 和 events 提供专门分支，其余路由统一执行无 `types` 过滤的 `application.search(...)`。
- `control/current-stage`、`control/current-tasks`、`control/changes`、`control/id-registry`、`control/templates`、lore 和 materials 路由尚无独立 renderer。
- Dashboard 仅展示当前焦点与游标；不存在创建当前阶段、编辑焦点或推进游标的 UI。
- 事件状态/重要度及上下文发布已经接入 ChangePreviewModal，但 Promise handler 没有统一失败反馈。

## 验证记录

- 当前源码 `tsc --noEmit`：退出码 0。
- 完整 Vitest：105 个测试文件、1323 项测试全部通过。
- 矩阵结构检查：见本任务完成时的 32 行数量与状态枚举命令结果。

## 遗留与影响

- 本任务只校正证据结论，不修复页面或写入流程。
- 后续任务不得用已存在的 repository/query 单测替代 UI 可达和真实 Obsidian 证据。
- 所有本次校正为“进行中”的 AC，必须在对应闭环任务完成后才能重新判定为“通过”。

## 回滚点

如审计事实被新的可复验证据推翻，可逐 AC 恢复状态；必须同时补充精确证据链接，不得只回滚状态文本。
