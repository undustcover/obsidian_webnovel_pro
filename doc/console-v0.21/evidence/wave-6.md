# Wave 6 自动化证据

- 日期：2026-09-09
- 范围：P0-070 稳定锚点
- 命令：`vitest run tests/console/stable-anchors.test.ts tests/ChapterSplitter.test.ts tests/ChapterMergeManager.test.ts tests/ChapterSorter.test.ts`
- 结果：退出码 0；4 个测试文件、108 项测试通过（其中稳定锚点专项 6 项）

稳定断言：

1. 拆分保留源章 `CH-*` 以及 EVT/TSK/FSH 锚点，不隐式移动关系。
2. 新章分配独立 `CH-*`；模板中的永久 ID、事件/修订/章节关系不复制。
3. 插入时 ID 会话内保留并单调递增，候选同时与当前索引和 MetadataCache 查重。
4. 合并正文回写保留 frontmatter 锚点；整批在首个写入前预检，任一磁盘锚点被并发修改时零写入并返回 `CHAPTER_STABLE_ANCHOR_CONFLICT`。
5. 智能排序只返回新顺序，不改任一 Markdown 的逻辑 ID 或关系锚点。

相关实现：`src/services/ChapterSplitter.ts`、`src/services/ChapterMergeManager.ts`、`src/services/ChapterSorter.ts`、`src/core/CommandManager.ts`。
