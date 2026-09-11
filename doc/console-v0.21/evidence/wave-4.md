# Wave 4：事件、里程碑与推进证据

- 日期：2026-09-09
- 范围：P0-040～P0-048；AC-10～AC-16
- 规范：`console.schema.v1`
- 环境说明：本机 `npm` 启动器缺少其全局入口模块，因此使用 `node_modules/.bin` 中由 lockfile 安装的同版本工具直接执行；未改变依赖图。

## 自动验证

| 检查 | 等价命令 | 结果 | 稳定断言 |
|---|---|---|---|
| TypeScript | `node_modules/.bin/tsc.cmd --noEmit` | 退出码 0 | Wave 4 领域、仓储、应用门面与 UI 类型通过 |
| ESLint | `node_modules/.bin/eslint.cmd --max-warnings=0 src/ main.ts` | 退出码 0 | 源码零 warning/error |
| Console CSS | `node_modules/.bin/stylelint.cmd ...`；`node_modules/.bin/tsx.cmd scripts/console-css-audit.ts` | 退出码 0 | Console 根作用域审计通过 |
| Wave 4 定向 | `node_modules/.bin/vitest.cmd run tests/console/event-repository.test.ts ... tests/console/NovelConsoleView.test.ts` | 10 文件、27 测试通过 | EVT round-trip、投影隔离、三状态、图、里程碑、游标、影响、确认链 |
| 全量回归 | `node_modules/.bin/vitest.cmd run` | 90 文件、1054 测试通过 | 既有功能与 Wave 0～3 无回归 |
| 全量覆盖率 | `node_modules/.bin/vitest.cmd run --coverage` | 退出码 0；90 文件、1054 测试通过 | Console application 99.42/80.92/100/99.42；domain 100/87.50/100/100；persistence 98.37/82.28/97.53/98.37（statements/branches/functions/lines） |

## 关键安全与语义断言

1. EVT 更新保留原 Markdown 正文；只写事件权威文件，不写章节侧派生字段。
2. 同一事件对象可进入多个时间轴投影；隐藏、现实、人物等重要度修改只产生目标 view key 的字段 diff。
3. 跨 calendar 仅分组和提示，不生成时间映射；环、缺边、跨线、不可达均返回解释性非数值结果。
4. `event_status`、`narrative_status`、`reader_state` 使用独立命令和独立字段 diff；不隐式联动。
5. 里程碑求值从不直接写 `completed`；事件、游标、里程碑推进均在预览后使用 plan-bound 一次性 token。
6. 推进预览阶段写入计数为 0；无令牌执行被拒绝且仍为 0；确认后才发生一次目标写入。
7. 游标撤销仅生成游标计划，并明确警告不会回滚事件、里程碑、知识状态或其他已确认事实。
