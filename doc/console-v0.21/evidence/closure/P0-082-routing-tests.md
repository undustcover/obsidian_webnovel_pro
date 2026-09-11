# P0-082C 路由穷尽测试

日期：2026-09-11  
状态：完成。

## 稳定断言

- `CONSOLE_PAGES` 与 `PAGE_DEFINITIONS` 键集合相等。
- `CONSOLE_NAVIGATION` 中每个路由出现且只出现一次。
- 每个页面定义均有专属空态；人物、道具和素材过滤语义有字段级断言。
- TypeScript `Record<ConsolePage, PageDefinition>` 保证新增路由缺定义时编译失败。

## 验证

`routing.test.ts` 5/5、Wave 8A 窄测试 15/15、完整测试 1168/1168 通过。

## 回滚点

测试本身无运行时回滚风险。
