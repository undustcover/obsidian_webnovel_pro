# WebNovel Assistant v0.3 发布说明

发布日期：2026-09-12  
插件清单版本：`0.3.0`  
Git 标签：`v0.3`

## 本版重点

- 新增桌面端“小说控制台”：集中完成首次项目配置、项目切换、索引诊断、恢复与五级叙事导航。
- 新增正文、人物、组织、地点、道具等实体中心，以及事件、时间轴投影、当前阶段、焦点、故事线游标、里程碑和任务管理。
- 接通建议决策、伏笔锚点、上下文预览与发布、资料健康检查等完整创作流程。
- 重要写入先展示文件变化、字段差异、风险和影响；取消时不写入，确认后执行，并保留并发检查、审计和失败恢复。
- 设定正式采用“分类目录 + 每个设定独立 Markdown 文件”；旧版二级标题合集仍可只读索引，不会在首次使用时批量迁移。
- 继续保留创作主页、写作工作台、章节、时间线、伏笔、任务、沉浸写作、统计、校对、合并和创建等既有功能。

## 安装与升级

从 GitHub Release 下载 `main.js`、`manifest.json` 和 `styles.css`，放入 Vault 的：

```text
.obsidian/plugins/web-novel-assistant/
```

然后在 Obsidian 的“设置 → 第三方插件”中启用 **WebNovel Assistant**。首次打开小说控制台时，按向导选择小说根目录；向导只保存配置，不会自动改写小说 Markdown。

完整操作方法见[中文操作手册](USER_GUIDE.md)或[English User Guide](USER_GUIDE_EN.md)，详细变更见[更新日志](CHANGELOG.md)。

## 兼容性与验证

- 最低 Obsidian 版本：`1.8.7`。
- 小说控制台仅在桌面端显示；原有移动端功能继续可用。
- 完整工程验证通过：125 个测试文件、1275 项测试，以及类型检查、Lint、CSS、国际化、API 审计和 10k Markdown 性能基准。
- 真实 Obsidian 候选回归已覆盖首次使用、安全写入、错误恢复和既有功能。版本与文档更新未改变运行行为，因此无需重复人工验收。

> [!IMPORTANT]
> 本仓库历史上存在 `3.x` 版本号。`0.3.0` 按语义化版本比较低于 `3.x`，已安装 `3.x` 的用户可能不会收到自动升级提示；请手动安装本版。此版本号按本次发布决定使用。

## 作者与许可证

- 作者：**undustcover**
- 许可证：MIT License
- Copyright (c) 2026 undustcover

---

## English summary

WebNovel Assistant v0.3 adds the desktop Novel Console, safe preview-before-write workflows, five-level narrative planning, entity centers, events, timelines, milestones, tasks, suggestions, foreshadowing, context publishing, and data-health checks. Canonical lore uses one Markdown file per entity while legacy heading-based collections remain readable. See the [English User Guide](USER_GUIDE_EN.md) for setup and workflows.

Because `0.3.0` sorts below historical `3.x` releases, existing `3.x` installations may require a manual upgrade.
