# 小说控制台 V0.21 P0 实施计划

> 本文回答“怎样改现有代码”。所有数据字段、枚举、算法和安全边界以 `spec.md` 为唯一规范；本文不得重复定义或变更其语义。

## 1. 实施目标与依赖方向

在保留 3.9.5 现有能力的前提下新增 Console 领域层、统一索引、应用服务、安全写入和单一 ItemView。依赖固定为：

```text
console/ui
  -> console/application
      -> console/domain
      -> console/indexing
      -> console/persistence
console/adapters -> console/domain
console/indexing -> console/adapters + console/domain
console/persistence -> console/domain + Obsidian Vault/FileManager ports
```

`console/domain` 不得导入 Obsidian、DOM、旧 Manager 或 UI。UI 不直接解析 Markdown；旧 Manager 不直接组装新领域对象。

## 2. 目录与文件改造

```text
src/console/
├─ domain/          # 已从 P0-004/P0-010 起建；纯类型、值对象与规则
├─ config/          # 项目映射、字段别名、设置迁移
├─ adapters/        # Properties 与各旧格式只读 adapter
├─ indexing/        # scope/classifier/registry/index/cache/coordinator
├─ application/     # queries、commands、推进、上下文、健康、影响分析
├─ persistence/     # Markdown planning、transaction、audit repositories
└─ ui/              # NovelConsoleView、router、pages、drawers、modal、CSS

tests/console/       # 领域、adapter、索引、写入、应用与 UI 测试
tests/fixtures/console/{minimal,mixed-legacy,large}/
doc/console-v0.21/  # 基线、验收矩阵、schema、演示与放行证据
```

现有文件的主要修改点：

| 文件 | 修改 |
|---|---|
| `src/types/settings.ts` | 增加可选 `consoleProjects`，保持旧设置字段不变 |
| `src/constants.ts` | 增加 Console 默认配置，不改变旧默认值 |
| `src/core/SettingsManager.ts` | 纯内存迁移/校验旧设置；不写 Vault |
| `src/ui/SettingsTab.ts` | 项目目录映射、字段别名、阈值设置 UI |
| `src/core/ServiceRegistry.ts` | 注册 Console 配置、索引、应用门面、事务和审计服务类型 |
| `src/core/PluginBootstrapper.ts` | 在旧核心服务成功后启动 Console；失败只降级 Console |
| `src/core/ViewManager.ts` | 桌面端注册/恢复/关闭新 view type，保留全部旧 view type |
| `src/core/CommandManager.ts` | 注册“打开小说控制台”等入口；新领域写命令仍经 application command bus |
| `src/services/FileEventManager.ts` | 向增量协调器转发 create/modify/delete/rename，不复制索引逻辑 |
| `src/services/ChapterSplitter.ts` / `ChapterMergeManager.ts` / `ChapterSorter.ts` | Wave 6 加稳定锚点保护与诊断钩子 |
| `src/styles/index.css` | 仅导入 Console 根作用域 CSS |
| `vitest.config.ts` | 把 Console 领域/应用/持久化加入高覆盖率门槛或分组校验 |

## 3. ServiceRegistry 装配

推荐注册键与依赖：

| 注册键 | 构造依赖 | 生命周期 |
|---|---|---|
| `ConsoleProjectConfigService` | SettingsManager | 设置加载后创建 |
| `ConsoleAdapterRegistry` | config、旧格式纯解析 ports | 设置加载后创建 |
| `ConsoleIndexService` | app.vault、metadataCache、adapters、snapshot store | layout ready 后后台 initialize |
| `ConsoleIndexCoordinator` | index、adaptive debounce | index 创建后 setup；shutdown 先停止事件 |
| `ConsoleAuditService` | plugin data adapter | 写服务前创建 |
| `ConsoleTransactionExecutor` | Vault/FileManager port、index、audit | index 后创建 |
| `ConsoleApplication` | index、config、transaction、audit | UI 只依赖该门面 |

注册发生在 `registerFeatureServices()` 的旧服务之后，或新增 `registerConsoleServices()` 明确隔离。`ServiceMap` 只增加键，不重命名现有键。注册顺序与 `destroyAll()` 逆序销毁相匹配：先销毁 UI/协调器，再等待索引/事务队列，最后释放 adapters/config。

## 4. 启动、关闭与降级

启动：

```text
loadSettings
-> 旧设置/旧核心服务照常初始化
-> migrateConsoleSettingsInMemory
-> registerConsoleServices（try/catch 独立边界）
-> registerAllViews/commands
-> layoutReady 后 ConsoleIndexService.initializeInBackground
-> 发布 indexing/idle/degraded/error 状态
```

- 初始化只读扫描，不创建项目状态、上下文或 ID。
- 单文件坏数据进入 snapshot diagnostics；其余文件继续。
- Console 注册或索引失败时记录错误并显示降级页，不抛出阻止旧插件启动。
- 非桌面端不注册 Console 打开命令或显示明确“不支持”；旧移动功能保持原样。

关闭：先禁止新命令，取消/解绑 Vault 事件与 ResizeObserver，等待当前增量批次和安全写入 settled，保存可重建缓存与轻量审计，最后由 registry 逆序 destroy。shutdown 不启动新的 Vault Markdown 写入。

## 5. 旧 Manager 与 adapter 边界

- `LegacyChapterAdapter` 复用章节识别/排序规则的纯函数或只读端口，不调用章节写方法。
- `LegacyLoreAdapter` 可复用 CharacterManager 的路径、标题、别名解析思想；不得把 Manager 缓存当统一索引，也不得以名称伪造 ID。
- `LegacyTimelineAdapter`、`LegacyForeshadowingAdapter`、`LegacyTimedTaskAdapter` 解析结果须与旧 Manager fixture 一致，但返回只读 legacy Entity/ActionItem。
- 旧 `TimelineManager/ForeshadowingManager/TaskManager/CharacterManager` 继续服务旧页面和旧写入。
- 新页面只能调用 `ConsoleApplication` 查询/命令；不得同时从旧 Manager 和新索引拼一套页面状态。
- 用户主动升级旧记录时，由 application 构造 ChangePlan；adapter 自身永不写入。

## 6. 索引初始化与增量事件流

初建按 spec 管线执行。`ProjectScopeResolver` 先根据 project root 与目录映射限定候选；`SourceClassifier` 用 Properties、目录和配置的旧功能文件名分类；adapter 返回实体与诊断；注册表、关系、全文和健康索引在内存构建；最后原子发布不可变 `IndexSnapshot`。

每 50 文件让出事件循环。UI 订阅快照和状态，不观察半成品 Map。缓存只保存版本化规范化数据/必要 token，不复制完整正文。

增量事件：

```text
Vault event
-> FileEventManager 转发 normalized event
-> ConsoleIndexCoordinator 合并同路径短时事件
-> 重解析一个 source contribution
-> 移除旧出链/全文 token，加入新贡献
-> 找到受影响入链对象
-> 增量重算相关诊断
-> 发布下一不可变 snapshot
-> 延迟保存缓存
```

rename 视为一个带 oldPath/newPath 的原子事件，不降级为 delete+create；ID 关系保持，路径 Wikilink 重新解析。只有项目映射变更和缓存恢复需要项目全扫。

## 7. 新旧写入边界

| 场景 | 写入者 |
|---|---|
| 旧时间线、旧伏笔、旧限时任务 | 现有 Manager |
| 新 `EVT/MLS/TSK/FSH`、项目状态、建议决策 | Console application command |
| 单文件低风险白名单字段 | application 规划后使用 FileManager；按 spec 风险决定是否确认 |
| 永久 ID、事实推进、游标、里程碑、权威/发布、高风险批量关系 | 必须 ChangePlan + ImpactReport + 明确确认 |
| 长正文 | 打开 Obsidian 原生 Markdown 编辑器 |
| 索引缓存、审计 | 插件数据目录，不是小说事实 |

事务执行器在内存保留本次目标原文，按规范路径排序写入；中途失败逆序补偿。外部修改使补偿不安全时停止并输出恢复报告。新写入完成后必须等待对应增量索引发布新 snapshot，再向 UI 返回成功。

## 8. UI 路由与页面装配

view type：`webnovel-novel-console`。`NovelConsoleView` 根元素固定 `.webnovel-console`，内部 RouterState 保存 `projectId/page/selectedKey/filters/detailsOpen`，`getState/setState` 只保存可恢复 UI 状态，不复制实体事实。

P0 路由：

```text
overview
control/{views,current-stage,current-tasks,novel-overview,changes,id-registry,templates}
narrative/{book,parts,volumes,units,plans,chapters}
manuscript
lore/{worlds,characters,organizations,locations,items,abilities,terms}
events/{control,milestones,reality,hidden,cosmic,archive}
materials/{references,ideas}
context
health
```

人物/事件/物品等页面共享 query/filter/result/detail 容器，但类型专属摘要由注册组件提供。详情面板只提交 command DTO。原始 Markdown 使用相邻 Workspace Leaf；窄 Leaf 核心操作移入固定工具栏/菜单。

`ResizeObserver` 只观察 Console 容器并设置 `data-layout=wide|medium|narrow`。CSS token 和普通选择器全部限定 `.webnovel-console`，Portal 限定 `.webnovel-console-modal`。

## 9. Wave 集成点、演示与放行

### Wave 0：基线与规格

- 集成：无运行时代码接线；建立文档、fixture、领域契约。
- 演示：基线四项命令通过；展示三套 fixture、32 AC、冻结 spec 与原子 tasks。
- 放行：P0-001..004 完成，任何未决契约已冻结或明确请求作者决策。

### Wave 1：领域、配置、adapter、索引

- 集成：SettingsManager -> config；旧格式只读 ports -> adapters；Vault -> index。
- 演示：混合 fixture 全量只读扫描，显示 ID 注册表、统一搜索、诊断、索引状态；modify/rename 单文件增量。
- 放行：首次扫描 write spy 为 0；删除/损坏缓存结果等价；坏文件不阻断；P0-010..019 自动测试通过。

### Wave 2：安全写入与 Console 壳

- 集成：application/transaction 注册；ViewManager/CommandManager 接入；CSS import。
- 演示：空壳 Console 宽中窄切换；测试命令预览、并发冲突中止、注入失败补偿。
- 放行：旧 view/command 回归；高风险无绕过路径；样式审计通过。

### Wave 3：核心创作路径

- 集成：叙事/正文/章节 queries、项目状态 repository、ContextPlanner 与双文件输出。
- 演示：从章节联合视图打开正文，预览上下文，原子生成 MD+JSON。
- 放行：稀疏层级、默认排除、唯一焦点、半套输出失败场景通过。

### Wave 4：事件与推进

- 集成：EventRepository、图、里程碑、cursor、ImpactAnalyzer 共用一个 IndexSnapshot。
- 演示：同一事件多视图独立权重；一次作者确认式推进及影响预览。
- 放行：三状态独立；环/跨线/不可比较不猜测；确认前零写入。

### Wave 5：任务、伏笔、人物、物品、健康

- 集成：ActionProjection、SuggestionDecision、FSH、entity centers、HealthRegistry。
- 演示：任务/伏笔正确进入 now/upcoming/missed/later，人物/物品投影与健康证据联动。
- 放行：spec 健康 Rule ID 全覆盖；事实问题无自动裁决；旧限时任务只读聚合。

### Wave 6：兼容、性能、发布

- 集成：章节拆分/合并/排序保护；全回归、CSS/无障碍、10k benchmark、故障演练。
- 演示：删除缓存重建、普通编辑单文件增量、写入中断恢复、32 AC 证据索引。
- 放行：AC-01..32 全部通过或存在作者批准的明确范围变更。

## 10. 回滚策略

1. 每个 Wave 保持旧入口可用；Console 通过单独 view/command 和可选配置启用。
2. Wave 1 索引异常：停用 Console index、删除派生缓存，Markdown 与旧功能不受影响。
3. Wave 2 UI 异常：注销/隐藏新 view 与命令，不删除新 schema 文件。
4. 新写入异常：执行器事务内补偿；需人工恢复时冻结后续 Console 写命令并输出精确文件报告。
5. 配置迁移异常：保留原始 settings 数据，只忽略无效 `consoleProjects` 条目并显示诊断。
6. 不以 `git reset`、批量 Markdown 逆迁移或删除旧格式作为运行时回滚方案。

## 11. 工程验证

每个原子任务至少运行最窄相关测试与 type-check；每个 P0 主任务完成时运行 lint 和相关集成；每个 Wave 放行运行完整 type-check/lint/test/coverage。基线与每次 Wave 证据写入 `doc/console-v0.21/evidence/`，并更新 `tasks.md` 与验收矩阵。
