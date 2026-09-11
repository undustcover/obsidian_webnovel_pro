# V0.21 缺失补齐闭环证据索引

本索引只负责追踪，不替代测试结果、截图、日志、diff、auditId 或人工验收记录。标记“待生成”的证据在对应原子任务完成前不得视为存在。

## 父任务索引

| 父任务 | 主要测试/检查 | 关联 AC | 自动证据 | 手工/候选包证据 |
|---|---|---|---|---|
| P0-076 验收状态校正 | 32 行与状态枚举检查 | 01、04、06、08、12～16、18、22～25、28、30、31 | [P0-076B-ac-audit.md](P0-076B-ac-audit.md) | [P0-076A-baseline.md](P0-076A-baseline.md) |
| P0-077 版本与部署一致性 | 版本一致性；artifact verifier | 01、30、31 | [version](P0-077-version.md)、[build info](P0-077-build-info.md) | [artifact verification](P0-077-artifact-verification.md) |
| P0-078 可用性状态契约 | 状态穷尽、配置诊断、应用映射测试 | 01、06、29 | [state contract](P0-078-state-contract.md)、[config diagnostics](P0-078-config-diagnostics.md)、[application state](P0-078-application-state.md) | Wave 7 首次使用记录（待生成） |
| P0-079 项目配置 UI | 表单、向导、切换器、设置页 UI 测试 | 01、06、29 | [form model](P0-079-form-model.md)、[onboarding](P0-079-onboarding.md)、[project switch](P0-079-project-switch.md)、[settings UI](P0-079-settings-ui.md) | test_20260910 首次配置与设置页验收（见对应证据） |
| P0-080 运行时重配置与恢复 | dispose、reconfigure、retry/rebuild 测试 | 01、29、32 | [dispose](P0-080-dispose.md)、[reconfigure](P0-080-reconfigure.md)、[recovery](P0-080-recovery.md) | 坏缓存自动恢复记录见 recovery 证据；真实 Obsidian 恢复 smoke 待 P0-091C |
| P0-081 响应式索引 UI | subscription、View 生命周期、五态渲染 | 01、03、06、29、32 | [subscription](P0-081-subscription.md)、[View lifecycle](P0-081-view-lifecycle.md)、[status panel](P0-081-status-panel.md) | [Wave 7 release](wave-7-release.md) |
| P0-082 声明式页面注册 | 页面契约、通用页过滤、路由穷尽测试 | 04、06、08 | [page contract](P0-082-page-contract.md)、[generic pages](P0-082-generic-pages.md)、[routing tests](P0-082-routing-tests.md) | 自动页面矩阵见 routing/wave8a pages tests |
| P0-083 总控页面 | overview/changes/ID/templates 查询与 UI 测试 | 06、09、30 | [overview](P0-083-overview.md)、[changes](P0-083-changes.md)、[ID registry](P0-083-id-registry.md)、[templates](P0-083-templates.md) | 自动总控页面记录见 wave8a queries tests |
| P0-084 叙事、设定与素材页面 | 六类叙事、七类设定、中心详情、素材路由测试 | 04、05、07～09 | [narrative](P0-084-narrative.md)、[lore](P0-084-lore.md)、[centers](P0-084-centers.md)、[materials](P0-084-materials.md) | 页面正例/空态见 wave8a pages tests |
| P0-085 当前阶段、焦点与游标 | 创建、唯一焦点、游标推进 UI/集成测试 | 14～16、31 | [首次创建](P0-085-stage-create.md)、[批准记录](P0-085-focus-blocker.md)、[焦点](P0-085-focus.md)、[游标](P0-085-cursors.md) | 重载恢复与取消零写入已自动验证；真实 smoke 在 P0-091 |
| P0-086 事件与里程碑 | 事件创建/编辑、三状态、里程碑推进测试 | 10～13、16、31 | [事件创建/编辑](P0-086-events.md)、[事件控制](P0-086-event-controls.md)、[里程碑](P0-086-milestones.md) | 自动写入边界已验证；真实 smoke 在 P0-091 |
| P0-087 任务、建议与伏笔 | 门面、任务分组/创建、五类决策、锚点测试 | 18～23、31 | [门面](P0-087-facade.md)、[任务](P0-087-tasks.md)、[建议](P0-087-suggestions.md)、[伏笔](P0-087-foreshadowing.md) | UI 决策与锚点自动验证；真实 smoke 在 P0-091 |
| P0-088 统一交互反馈 | action runner、写入口审计/UI 测试 | 12～16、18、22、23、31 | [ActionRunner](P0-088-action-runner.md)、[入口迁移](P0-088-action-migration.md) | [Wave 8 放行](wave-8-release.md) |
| P0-089 首次使用与恢复测试 | fixture 自检、first-run 集成、时序/恢复 | 01、06、29、32 | [fixtures](P0-089-fixtures.md)、[first run](P0-089-first-run.md)、[recovery](P0-089-recovery-tests.md) | 自动恢复链路已完成；真实 Obsidian 恢复 smoke 待 P0-091 |
| P0-090 路由与操作可达性测试 | 全路由矩阵、命令追踪、错误审计 | 04、06、08、12～16、18、22～25、28、31 | [routes](P0-090-routes.md)、[actions](P0-090-actions.md)、[error feedback](P0-090-error-feedback.md) | 自动操作矩阵已完成；真实交互待 P0-091 |
| P0-091 真实 Obsidian smoke | fixture hash/数量清单 | 01～31 | [Vault setup](P0-091-vault-setup.md) | [first run（通过）](P0-091-first-run-smoke.md)、[write smoke（通过）](P0-091-write-smoke.md)、[recovery smoke（进行中）](P0-091-recovery-smoke.md) |
| P0-092 视觉、缩放、键盘与无障碍 | CSS/stylelint/accessibility 测试 | 02、03、31 | [layout 自动证据](P0-092-layout.md)，CSS/a11y audit 待后续闭环 | `P0-092-layout.md`（进行中）、`P0-092-theme-scale.md`、`P0-092-accessibility.md` 以及 `../AC-02/`、`../AC-03/` |
| P0-093 回归与候选包 | 完整测试、coverage、审计、10k benchmark、artifact verifier | 01～32 | [旧能力回归](P0-093-legacy-regression.md)；[完整工程验证](P0-093-engineering-validation.md) | [旧能力真实回归（通过）](P0-093-legacy-regression.md)；`P0-093-release-candidate.md`、`P0-093-rc-smoke.md`（待生成） |
| P0-094 最终验收与签字 | 任务解析、32 行 AC 审计、报告必填项 | 01～32 | `P0-094-task-audit.md`、`P0-094-ac-audit.md`（待生成） | `V0.21-final-acceptance.md`（待生成） |

## 受影响 AC 反向索引

| AC | 主要闭环任务 | 当前审计证据 | 最终证据入口 |
|---:|---|---|---|
| AC-01 | P0-077～081、089、091～094 | [P0-076B](P0-076B-ac-audit.md) | P0-091 first-run smoke、P0-093 RC smoke |
| AC-04 | P0-082、084、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-090 routes、P0-091 smoke |
| AC-06 | P0-079、081、083、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-083 overview、P0-090 routes |
| AC-08 | P0-082、084、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-084 centers、P0-091 smoke |
| AC-12 | P0-086、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-086 event controls、P0-091 write smoke |
| AC-13 | P0-086、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-086 milestones、P0-091 write smoke |
| AC-14 | P0-085、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-085 focus/cursors、P0-091 write smoke |
| AC-15 | P0-085、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-085 cursors、P0-091 write smoke |
| AC-16 | P0-085、086、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-090 actions、P0-091 write smoke |
| AC-18 | P0-087、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-087 tasks、P0-091 write smoke |
| AC-22 | P0-087、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-087 suggestions、P0-091 write smoke |
| AC-23 | P0-087、088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-087 foreshadowing、P0-091 write smoke |
| AC-24 | P0-088、090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-090 routes/actions、P0-091 write smoke |
| AC-25 | P0-088、090～092、094 | [P0-076B](P0-076B-ac-audit.md) | P0-090 routes、P0-092 accessibility |
| AC-28 | P0-090、091、094 | [P0-076B](P0-076B-ac-audit.md) | P0-091 recovery smoke |
| AC-30 | P0-091、093、094 | [P0-076B](P0-076B-ac-audit.md) | P0-093 legacy regression/RC smoke |
| AC-31 | P0-085～088、090～094 | [P0-076B](P0-076B-ac-audit.md) | P0-090 actions、P0-091 write smoke、P0-093 RC smoke |

## P0-093 发布收口

- [旧能力回归](P0-093-legacy-regression.md)
- [完整工程验证](P0-093-engineering-validation.md)
- [发布候选固化](P0-093-release-candidate.md)

## 索引维护规则

1. 原子任务完成时，将对应“待生成”条目替换为实际相对链接，并写入命令、退出码、稳定断言和遗留问题。
2. 手工证据必须记录 Obsidian/插件版本、主题、缩放、Leaf 宽度、步骤、预期与实际；发布候选还必须记录 hash。
3. AC 状态只能根据其所需全部证据更新，不得因本索引存在占位而升级。
4. 若任务范围经批准变更，索引必须同时链接变更记录和批准信息。
