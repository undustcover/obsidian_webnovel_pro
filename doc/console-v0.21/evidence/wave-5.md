# Wave 5：任务、伏笔、人物、物品与健康证据

- 日期：2026-09-09
- 范围：P0-050～P0-062；AC-08、AC-18～AC-23、AC-28
- 规范：`console.schema.v1`
- 环境说明：本机 `npm` 启动器缺少其全局入口模块，因此使用 `node_modules/.bin` 中由 lockfile 安装的同版本工具直接执行；未改变依赖图。

## 自动验证

| 检查 | 等价命令 | 结果 | 稳定断言 |
|---|---|---|---|
| TypeScript | `node_modules/.bin/tsc.cmd --noEmit` | 退出码 0 | Wave 5 领域、仓储、应用服务与 UI 类型通过 |
| ESLint | `node_modules/.bin/eslint.cmd --max-warnings=0 src main.ts` | 退出码 0 | 源码零 warning/error |
| CSS 与平台审计 | `stylelint`、`console-css-audit.ts`、`obsidian-audit.ts`、`i18n-audit.ts` | 退出码均为 0 | Console CSS 根作用域、Obsidian API 与 1101 个 i18n key 审计通过 |
| 全量覆盖率回归 | `node_modules/.bin/vitest.cmd run --coverage` | 96 文件、1072 测试通过；退出码 0 | Console application 99.51/80.57/96.26/99.51；domain 100/84.61/100/100；persistence 98.55/80.51/98.14/98.55（statements/branches/functions/lines） |

## 验收证据映射

| 范围 | 测试证据 | 覆盖内容 |
|---|---|---|
| TSK 与行动分组 | `tasks.test.ts`、`action-groups.test.ts` | 六种 activation、关联/激活分离、状态迁移、now/upcoming/missed/later/needs_confirmation、旧任务聚合 |
| 建议决策 | `suggestions.test.ts` | 确定性 ID、latest decision、非转换零任务写入、确认转换合并 ChangePlan |
| 伏笔 | `foreshadowing.test.ts` | 新稳定锚点、旧格式拒绝自动升级、接近与错过规则、受控状态更新 |
| 人物与道具 | `entity-centers.test.ts`、`NovelConsoleView.test.ts` | 事件/章节经历投影、当前位置冲突、持有历史与多持有人冲突、详情路由 |
| 健康规则与页面 | `health.test.ts`、`dashboard.test.ts` | 34 个稳定 Rule ID、结构/连续性/推进证据、四级筛选、安全修复白名单、总览摘要 |

## 关键安全与语义断言

1. 新 TSK 创建、更新和删除均使用 ChangePlan；删除被归类为高风险且必须确认。旧限时任务仅聚合展示，不分配 TSK ID，也不改写日期逻辑。
2. 历史、隐藏、宇宙或非当前故事线事件不会只因 `occurred` 激活行动；跨线、环、不可达和坏锚点均进入解释性安全路径。
3. 建议的延后、忽略、不适用和保持建议只记录决策；只有明确转换才同时创建 TSK，并继续经过预览确认链。
4. 新 FSH 可读写稳定事件锚点；旧 FSH 不会被静默升级，规则不会自动标记埋设、推进或揭示。
5. 人物与物品经历由事件/章节关系投影；位置、状态、持有和所有权冲突仅报告证据，不自动裁决事实。
6. 健康注册表冻结 34 个 Rule ID；事实类诊断没有 `autoFixKind`，健康页只为显式白名单项显示安全修复入口。
