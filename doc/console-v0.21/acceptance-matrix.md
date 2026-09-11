# V0.21 P0 验收追踪矩阵

本表是 `spec.md` 的规范性附件。Owner 表示负责实现与提供证据的任务，不表示可以改变验收语义。状态只允许 `未开始 / 进行中 / 通过 / 阻塞 / 经批准变更`。

| AC | 验收要求 | Owner | 测试方式 | 证据位置 | 状态 |
|---:|---|---|---|---|---|
| AC-01 | Console 作为 Obsidian 标签页并可与 Markdown 分屏 | P0-024 | UI 集成 + 手工复现 | `tests/console/NovelConsoleView.test.ts`；`doc/console-v0.21/evidence/AC-01.md` | 进行中 |
| AC-02 | Console 样式不污染宿主主题、编辑器和其他插件 | P0-027/P0-072 | 静态 CSS 审计 + 截图 | `scripts/console-css-audit.ts`；`doc/console-v0.21/evidence/AC-02/` | 进行中 |
| AC-03 | 不同桌面 Leaf 宽度下核心操作可达 | P0-026/P0-072 | UI 自动测试 + 760/1180 边界手工截图 | `tests/console/layout.test.ts`；`doc/console-v0.21/evidence/AC-03/` | 进行中 |
| AC-04 | 导航符合需求且叙事与正文语义分离 | P0-025/P0-031 | 路由测试 + 页面审查 | `tests/console/routing.test.ts`；`tests/console/wave8a-queries.test.ts`；`doc/console-v0.21/evidence/closure/P0-082-routing-tests.md`；`doc/console-v0.21/evidence/closure/P0-084-narrative.md` | 进行中 |
| AC-05 | 五级叙事结构任一级缺省仍可导航 | P0-030 | 领域/查询集成测试 | `tests/console/narrative-tree.test.ts`；minimal fixture；`doc/console-v0.21/evidence/wave-3.md` | 通过 |
| AC-06 | 总控各入口存在且职责正确 | P0-039/P0-056 | UI 导航测试 + 手工验收 | `tests/console/dashboard.test.ts`；`tests/console/routing.test.ts`；`tests/console/wave8a-queries.test.ts`；`doc/console-v0.21/evidence/closure/P0-083-overview.md` | 进行中 |
| AC-07 | 识别并展示现有项目主要结构化资料 | P0-012/P0-013/P0-014/P0-016 | adapter 契约 + 索引集成 | `tests/console/adapters.test.ts`；mixed-legacy fixture；`doc/console-v0.21/evidence/wave-1.md` | 通过 |
| AC-08 | 人物、事件、道具有独立入口与核心字段 | P0-041/P0-057/P0-058 | UI/查询测试 | `tests/console/entity-centers.test.ts`；`tests/console/wave8a-pages.test.ts`；`tests/console/NovelConsoleView.test.ts`；`doc/console-v0.21/evidence/closure/P0-084-centers.md` | 进行中 |
| AC-09 | 核心对象支持标题、别名、ID、正文及规定条件检索 | P0-017 | 查询组合与分页测试 | `tests/console/indexing.test.ts`；`doc/console-v0.21/evidence/wave-1.md` | 通过 |
| AC-10 | 同一 EVT 可投影多个时间轴且不复制实体 | P0-041 | 投影单测 + 索引集成 | `tests/console/timeline-projection.test.ts`；`doc/console-v0.21/evidence/wave-4.md` | 通过 |
| AC-11 | 不同视图重要度互不影响 | P0-042 | 命令单测 + 写入 diff | `tests/console/event-states.test.ts`；`doc/console-v0.21/evidence/wave-4.md` | 通过 |
| AC-12 | 事实、叙事、信息状态独立展示与修改 | P0-043 | 领域/命令/UI 测试 | `tests/console/event-states.test.ts`；`doc/console-v0.21/evidence/closure/P0-086-event-controls.md`；`doc/console-v0.21/evidence/closure/P0-088-action-migration.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-13 | 里程碑按事件条件求值，正式完成需确认 | P0-045/P0-048 | all/any/sequence/manual 表驱动测试 | `tests/console/milestones.test.ts`；`tests/console/progression-integration.test.ts`；`doc/console-v0.21/evidence/closure/P0-086-milestones.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-14 | 多线保存游标且只有一个当前焦点 | P0-033/P0-046 | repository + 不变量测试 | `tests/console/project-state.test.ts`；`tests/console/cursor-suggestions.test.ts`；`doc/console-v0.21/evidence/closure/P0-085-focus.md`；`doc/console-v0.21/evidence/closure/P0-085-cursors.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-15 | 系统只建议当前事件，不自动推进游标 | P0-046 | 零写入 spy + 建议测试 | `tests/console/cursor-suggestions.test.ts`；`doc/console-v0.21/evidence/closure/P0-085-cursors.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-16 | 推进事件、游标或里程碑前展示影响 | P0-047/P0-048 | ImpactReport 契约 + UI 测试 | `tests/console/progression-impact.test.ts`；`tests/console/progression-integration.test.ts`；`doc/console-v0.21/evidence/closure/P0-085-cursors.md`；`doc/console-v0.21/evidence/closure/P0-086-milestones.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-17 | 拆分、合并、插入、重排不破坏稳定锚点 | P0-070 | 兼容集成测试 | `tests/console/stable-anchors.test.ts`；`doc/console-v0.21/evidence/wave-6.md` | 通过 |
| AC-18 | 可创建关联事件或里程碑的 TSK | P0-050 | repository/写入测试 | `tests/console/tasks.test.ts`；`tests/console/wave8b-facade.test.ts`；`doc/console-v0.21/evidence/closure/P0-087-tasks.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-19 | 历史、隐藏、宇宙事件不会仅凭 occurred 激活任务 | P0-051 | 行动分组表驱动测试 | `tests/console/action-groups.test.ts`；`doc/console-v0.21/evidence/wave-5.md` | 通过 |
| AC-20 | 游标接近锚点时任务进入正确分组 | P0-044/P0-051 | 图距离与分组测试 | `tests/console/action-groups.test.ts`；`doc/console-v0.21/evidence/wave-5.md` | 通过 |
| AC-21 | 越过锚点且未完成的任务进入已错过 | P0-051 | 顺序/不可达/跨线测试 | `tests/console/action-groups.test.ts`；`doc/console-v0.21/evidence/wave-5.md` | 通过 |
| AC-22 | 建议经确认后才成为正式 TSK | P0-053 | 决策与零写入测试 | `tests/console/suggestions.test.ts`；`tests/console/wave8b-facade.test.ts`；`doc/console-v0.21/evidence/closure/P0-087-suggestions.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-23 | FSH 支持埋设、推进、揭示锚点及错过提示 | P0-054/P0-055 | adapter + 规则集成 | `tests/console/foreshadowing.test.ts`；`tests/console/wave8b-facade.test.ts`；`doc/console-v0.21/evidence/closure/P0-087-foreshadowing.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-24 | 可预览章节、事件、任务、人物上下文 | P0-036/P0-037 | ContextPlanner + UI 测试 | `tests/console/context-planner.test.ts`；`doc/console-v0.21/evidence/wave-3.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-25 | 上下文逐项显示原因、权威、知识边界、手动状态 | P0-037 | Schema/UI 测试 | `tests/console/context-view.test.ts`；`doc/console-v0.21/evidence/wave-3.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-26 | 候选、历史、废弃、测试默认排除 | P0-036 | 策略表驱动测试 | `tests/console/context-policy.test.ts`；`doc/console-v0.21/evidence/wave-3.md` | 通过 |
| AC-27 | 上下文清单可被 AGENTS.md/Skill 稳定读取 | P0-038 | JSON Schema + Markdown golden | `tests/console/context-output.test.ts`；`doc/console-v0.21/schemas/`；`doc/console-v0.21/evidence/wave-3.md` | 通过 |
| AC-28 | 发现第 20 章的结构、连续性和推进问题 | P0-059/P0-060/P0-061 | 每条 rule ID 的 fixture 测试 | `tests/console/health.test.ts`；`tests/console/wave5-fixtures.ts`；`doc/console-v0.21/evidence/wave-5.md`；`doc/console-v0.21/evidence/closure/P0-076B-ac-audit.md` | 进行中 |
| AC-29 | 首次启用对用户 Markdown 零批量写入 | P0-016 | Vault write spy 集成测试 | `tests/console/indexing.test.ts`；`doc/console-v0.21/evidence/wave-1.md` | 通过 |
| AC-30 | 既有主页、章节、时间线、伏笔、设定、任务、写作、工具可用 | P0-071 | 55 文件基线 + smoke matrix | `doc/console-v0.21/baseline.md`；`doc/console-v0.21/evidence/AC-30.md` | 通过 |
| AC-31 | 所有高风险写操作必须预览并明确确认 | P0-020/P0-028/P0-048 | 命令权限矩阵 + UI 测试 | `tests/console/high-risk-commands.test.ts` | 进行中 |
| AC-32 | 大型 Vault 增量索引，普通编辑不全扫 | P0-019/P0-073 | 10k fixture benchmark + 扫描计数断言 | `tests/console/indexing.test.ts`；`tests/fixtures/console/large/`；`scripts/console-large-vault-benchmark.ts`；`doc/console-v0.21/evidence/AC-32.md` | 通过 |

## 证据规则

1. 自动测试证据必须记录命令、退出码和稳定断言，不以截图代替数据语义测试。
2. 手工证据必须记录 Obsidian 版本、插件版本、主题、系统缩放、Leaf 宽度、步骤与预期/实际结果。
3. 同一证据可覆盖多条 AC，但每条 AC 必须反向链接到精确测试或记录。
4. 只有自动与必需手工证据均通过后，状态才可改为“通过”。
