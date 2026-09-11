# P0-086A 事件创建与允许字段编辑

- 实现：事件控制页提供创建表单和安全默认 `EventData`；事件详情仅暴露故事线、时间、顺序、前置/承载/实体引用、因果与证据等白名单字段，经 `EventRepository.planCreate/planUpdate` 生成预览。
- 约束：坏 ID、重复 ID、缺失事件或源文件在规划阶段失败；不复制实体，不改章节侧权威字段。
- 测试：`wave8b-facade.test.ts`、`wave8b-pages.test.ts`、`event-repository.test.ts`、`action-runner.test.ts`。
- 验证：全量测试及静态门禁通过。

