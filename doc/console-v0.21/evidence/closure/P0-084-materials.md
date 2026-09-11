# P0-084D 素材页面

日期：2026-09-11  
状态：完成。

## 规范边界与实现

- 规范 `EntityType` 未定义 reference/idea，因此没有扩展 schema。
- 参考资料页只接纳 `type: reference/参考资料` 的 schema-unknown 兼容记录；灵感页只接纳 `type: idea/灵感`。
- 两页显示独立空态、只读说明、详情与相邻编辑器原文入口；没有采集器或网络能力。

## 验证

`routing.test.ts` 和 `wave8a-pages.test.ts` 覆盖两路由正例、互斥、其他 unknown 排除和空态声明。素材入口不再等价于全局搜索。

## 回滚点

两个 PageDefinition 与只读提示可独立撤回；无 Markdown 写入。
