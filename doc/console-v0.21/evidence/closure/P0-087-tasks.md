# P0-087B 当前任务页与任务创建

- 实现：页面展示 now/missed/upcoming/later/needs_confirmation 五组，并展示来源、原因、锚点；可基于 EVT/MLS 创建任务并更新允许的任务状态。
- 约束：坏锚点在门面规划前失败；Legacy 任务只读且不自动升级；状态下拉恢复当前状态，不隐式回退为 planned。
- 测试：`wave8b-pages.test.ts`、`wave8b-facade.test.ts`、`tasks.test.ts`、`action-groups.test.ts`。
- 验证：分组、关联创建、状态转换、坏锚点及 Legacy 只读均通过。

