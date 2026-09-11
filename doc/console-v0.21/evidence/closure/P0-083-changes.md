# P0-083B 重要变更页

日期：2026-09-11  
状态：完成。

## 实现

- `ChangesQuery` 只读取既有 `AuditRepository`，按 startedAt/auditId 倒序返回脱敏记录。
- `ChangesPage` 展示时间、命令、结果、auditId、目标、路径、字段 diff、错误码和补偿/人工恢复报告。
- `ConsoleApplication` 通过可选 audit 依赖暴露查询；Bootstrapper 注入既有仓库。页面没有审计修改入口，也不展示正文全文。

## 验证

测试覆盖空仓库稳定降级、成功和 manual recovery 排序/标记、脱敏输出；原 `audit.test.ts` 继续验证正文类字段不持久化。完整 1168 项测试通过。

## 回滚点

移除查询和页面接线不影响 `TransactionExecutor` 的审计写入。
