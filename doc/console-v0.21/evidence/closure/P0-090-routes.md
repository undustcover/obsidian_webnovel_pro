# P0-090A 全部路由行为矩阵

日期：2026-09-11

## 结果

- `route-behavior-matrix.test.ts` 对全部 32 个 `ConsolePage` 逐页断言：唯一导航入口、标题、正例契约、专属过滤、显式空态和声明动作。
- 所有 renderer 均由 `NovelConsoleView` 分派；查询词进入实体、叙事、里程碑、正文和全局搜索的实际查询边界。
- 既有页面测试继续覆盖总控、叙事、设定中心、素材、事件、任务、建议和伏笔的真实渲染正例/空态。
- 新增 `bindCardActivation`，全局搜索、通用实体和里程碑结果卡统一支持鼠标、Enter 与 Space，并具有 `role=button` 和可聚焦状态。

## 验证

- P0-090 路由/操作/错误相关 10 个测试文件、83/83 通过。
- 完整工程测试 125 个文件、1268/1268 通过。
- type-check、ESLint、Stylelint、CSS architecture/scope、i18n 与 Obsidian API audit 通过。

## 回滚点

路由矩阵测试可独立回滚；卡片激活修复集中在 `bindCardActivation` 及三个调用点。

