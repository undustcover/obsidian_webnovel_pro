# P0-084A 分层叙事页

日期：2026-09-11  
状态：完成。

## 实现

- `NarrativeLevelQuery` 复用 `NarrativeTreeQuery`，对 BOOK/PART/VOL/UNIT/PLN/CH 六层做精确类型投影。
- 每项保留显式关系形成的祖先面包屑；跳级和孤立节点仍可见，环继续由原查询诊断并断开。
- 不读取目录深度，也不猜测缺失父级。

## 验证

`wave8a-queries.test.ts` 覆盖六路由、BOOK→UNIT 跳级、孤立 PLN 与 PART/VOL 环；`narrative-tree.test.ts` 回归通过。

## 回滚点

保留原 `NarrativeTreeQuery`，可只撤回层级 adapter/page。
