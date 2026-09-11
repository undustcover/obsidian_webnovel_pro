# P0-090B 写操作可达矩阵

日期：2026-09-11

## 双向追踪

`action-reachability-matrix.test.ts` 对 15 个专用 preview 门面逐项建立：应用方法 → UI action key → 目标/字段 → command risk → ChangePreview → 确认 token → execute/cancel。

覆盖当前阶段、游标、事件创建/字段/三状态/三时间线重要度、里程碑、任务创建/状态、建议五类决策、伏笔、章节标题和上下文发布。测试反向枚举 `ConsoleApplication` 全部专用 `preview*` 方法，确保没有已实现但未入矩阵的 P0 写门面。

## 安全断言

- 全部涉及的 command policy 均 `requiresConfirmation=true`；高风险推进和中风险结构写入未降级。
- 每个 action key 包含目标作用域；关键字段白名单从应用、UI 和 repository 合同交叉核对。
- 每个矩阵项实际运行成功路径和取消路径；取消时 execute 调用为零。
- 既有 facade、progression、transaction、high-risk 和字段白名单测试继续承担领域参数精确断言。

## 验证

- 可达矩阵 16/16；P0-090 合并回归 83/83；完整工程 1268/1268 通过。
- type-check 与完整 lint/audit 通过。

