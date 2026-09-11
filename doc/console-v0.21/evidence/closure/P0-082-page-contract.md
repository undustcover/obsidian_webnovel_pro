# P0-082A PageDefinition 契约

日期：2026-09-11  
状态：完成。

## 实现与边界

- 新增 `pageRegistry.ts`，为全部 32 个 `ConsolePage` 声明标题、分组、renderer、实体过滤、允许动作与专属空态。
- `PAGE_DEFINITIONS` 使用 `satisfies Record<ConsolePage, PageDefinition>`，新增或删除路由会触发 TypeScript 穷尽错误。
- 导航分组由注册表派生；注册表只保存声明式元数据，不执行领域查询。
- 素材未加入规范 `EntityType`；只声明 schema-unknown 兼容别名，没有改 schema 或枚举。

## 验证

- `tests/console/routing.test.ts`：定义集合等于路由集合，每个导航项恰有一个定义，空态非空。
- `tsc --noEmit`、定向 ESLint、57 个 Console 测试通过。

## 回滚点

注册表、导航派生和消费者同批回滚；不涉及 Markdown 或设置写入。
