# P0-087D 伏笔锚点操作 UI

- 实现：详情展示 truth/plant/advance/reveal 四组锚点、状态和接近/错过诊断；正式 FSH 可预览修改锚点及允许状态，Legacy 只读。
- 安全：所有提交锚点必须解析为事件；规则按锚点事件自己的 storyline 读取游标，跨线游标不会误判；不自动升级 Legacy、不自动裁决事实。
- 测试：`foreshadowing.test.ts`、`wave8b-pages.test.ts`、`wave8b-facade.test.ts`、`progression-impact.test.ts`。
- 验证：锚点展示、坏锚点、跨线、接近/错过、Legacy 只读和影响展开通过。

