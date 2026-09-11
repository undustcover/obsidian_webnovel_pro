# P0-082B 通用列表页面

日期：2026-09-11  
状态：完成。

## 实现

- 新增 `GenericEntityPage`，查询先应用 `PageDefinition.entityFilter.types`，再应用兼容 raw type 过滤。
- `NovelConsoleView` 按 renderer 显式分派；仅总览非空搜索保留明确的全局搜索语义，业务页面不再回落到全实体列表。
- 通用卡片支持鼠标、Enter 和 Space 打开详情，并使用每页独立空态。

## 验证

- `wave8a-pages.test.ts` 锁定人物、道具、参考资料、灵感及其他 unknown 记录互不泄漏。
- Console 回归 57/57 文件、209/209 测试通过；type-check 与定向 lint 通过。

## 回滚点

可回滚共享查询/renderer 和 View 分派，不影响索引与用户 Markdown。
