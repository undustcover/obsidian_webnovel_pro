# P0-088C Wave 8 集成放行

## 页面矩阵

| 页面/详情 | 只读证据 | 写入入口 | 安全边界 |
|---|---|---|---|
| 当前阶段 | 配置/焦点/多线游标 | 首次创建、设置/清除焦点、同线游标推进 | `null` 保留游标；跨线拒绝 |
| 事件控制/详情 | 规定时间轴投影、三状态、各视图重要度 | 创建、白名单编辑、独立状态/重要度 | 不改章节权威；目标字段隔离 |
| 里程碑 | 条件、状态、领域求值 | 确认式推进 | UI 不重算；非法转换拒绝 |
| 当前任务 | 五组、来源、原因、锚点 | 创建、允许状态更新 | 坏锚点拒绝；Legacy 只读 |
| 建议 | 规则、目标、锚点 | 五种决策、原子转任务 | 幂等；非转换不建 TSK |
| 伏笔 | 四组锚点、接近/错过证据 | 正式 FSH 锚点/状态修改 | 跨线不猜；Legacy 只读 |

## 操作矩阵

| 阶段 | 行为 | 自动验证 |
|---|---|---|
| plan | 同步抛错/异步拒绝可见 | `action-runner.test.ts` |
| preview | 文件/字段/关系/影响可检查 | 门面与 progression 测试 |
| confirm | 取消零写入、令牌绑定 plan 且一次性 | runner/transaction 测试 |
| execute | mtime/hash 冲突、补偿、人工恢复报告 | transaction/recovery 测试 |
| refresh | 成功等待 snapshot 版本并显示 | progression/runner 测试 |

## 放行结果

- 2026-09-11：118 个测试文件、1191 个测试全部通过。
- 覆盖率：整体行 72.24%；application 99.43%、domain 98.51%、persistence 98.56%。
- `tsc --noEmit`、ESLint、Stylelint、CSS 架构/作用域、Obsidian API、i18n 审计全部通过。
- Gate B“可理解”和 Gate C“可操作且安全”在自动化页面/应用/事务边界通过。真实 Obsidian 发布候选 smoke 属于 Wave 9 的 P0-090～093，不冒充为本放行证据。

