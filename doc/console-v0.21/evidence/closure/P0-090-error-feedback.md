# P0-090C 错误反馈审计

日期：2026-09-11

## 静态审计

- 新增 `scripts/console-error-feedback-audit.ts` 与 `audit:console-errors` 脚本，基于 TypeScript AST 检查 Console UI 的 void Promise、空 catch 和只有日志而无恢复反馈的 catch。
- 已知未捕获 Promise、空 catch、`console.error`-only 三类坏样本均能触发失败；当前 `src/console/ui` 审计为零问题。

## 修复

- Dashboard、当前阶段/任务、小说总览、变更、游标建议、伏笔读取和打开原文/沉浸入口统一经受控异步边界，失败显示“操作失败，可重试”及技术信息。
- ChangePreviewModal 的确认回调失败时不再产生未捕获 Promise；Modal 保持打开、重新启用确认按钮并显示可重试错误。
- ConsoleActionRunner 的 planning、confirmation、execution、success、cancel、failed 和重复点击路径保持统一反馈，所有结束路径释放 busy key。

## 验证

- 错误审计/UI 测试 6/6，Modal 测试 2/2；P0-090 合并回归 83/83、完整工程 1268/1268 通过。
- CLI：`node node_modules/tsx/dist/cli.mjs scripts/console-error-feedback-audit.ts`，退出码 0。

