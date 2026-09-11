# P0-083C ID 注册表页

日期：2026-09-11  
状态：完成。

## 实现

- `IdRegistryQuery` 基于当前 snapshot/IdRegistry，按类型输出占用、缺失、重复、格式问题和 next candidate。
- 错配前缀仍视为全项目已占用，候选 ID 不会与错误类型记录盲碰撞。
- 页面显示来源路径和诊断，不提供自动写回或 legacy ID 分配。

## 验证

`wave8a-queries.test.ts` 覆盖正常占用、缺失、重复、类型错配、候选计算；既有 IdRegistry 测试继续覆盖复合 `REV-CH` 格式。完整测试与覆盖率通过。

## 回滚点

只读查询与页面可独立撤回。
