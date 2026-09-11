# 小说控制台 V0.21 P0 规范

> Schema：`console.schema.v1`  
> 状态：Frozen  
> 冻结日期：2026-09-09  
> 需求基线：`../改造方案/小说控制台需求报告_V0.21.md`

本文定义“实现什么”。实现不得自行改变本文件中的字段语义、事实权威端、状态转换、算法或安全边界。发现真实 Vault 与本规范不一致时，保留原值并产生诊断；需要改变规范时，先提交范围变更并由作者批准，再提升 schema 版本或记录兼容修订。

## 1. 不变量与边界

1. Markdown 是唯一事实源；缓存、倒排索引、派生建议和 UI 状态均可删除重建。
2. 首次启用和普通索引扫描对 Vault Markdown 零写入。
3. `id` 是逻辑身份，`source.path + source.anchor` 是物理定位，两者不得混用。
4. 旧格式 adapter 只读。旧记录没有 ID 时使用 `legacy:<normalized-path>#<anchor-or-file>` 作为运行期 key，但该 key 不得成为新对象的长期关系值。
5. 事件事实、叙事承载、读者/POV 知识状态相互独立，任何命令不得隐式联动。
6. 高风险命令必须经过 `ChangePlan -> ImpactReport -> 作者确认 -> 并发校验 -> 写入 -> 索引刷新 -> 审计`。
7. 新 Console 仅在桌面端提供入口；不得把 `manifest.isDesktopOnly` 改为 `true`，不得删除既有移动能力。
8. P0 不自动批量补 ID、不自动重新编号、不自动裁决小说事实、不自动推进游标、不自动把建议转任务。

## 2. Schema 标识与公共表示

- 领域 schema：`console.schema.v1`
- 索引快照：`console.index.v1`
- 上下文 JSON：`console.context.v1`
- ChangePlan：`console.change-plan.v1`
- ImpactReport：`console.impact-report.v1`
- 审计：`console.audit.v1`

所有可持久化时间戳使用 ISO 8601，带时区。Vault 内 ID 引用的规范值是裸永久 ID；adapter 接受 `[[ID]]`、`[[path|label]]` 和历史名称，并同时保留 `raw`。路径统一为 Vault 相对路径、正斜杠、无前导斜杠。

## 3. 实体 Schema

### 3.1 类型与 ID

| EntityType | 永久 ID | P0 含义 |
|---|---|---|
| `book` | `BOOK-0001` | 全书规划 |
| `part` | `PART-0001` | 分部 |
| `volume` | `VOL-0001` | 分卷 |
| `unit` | `UNIT-0001` | 单元 |
| `plan` | `PLN-0001` | 章节/场景策划 |
| `chapter` | `CH-0001` | 正文章节 |
| `chapter_revision` | `REV-CH-0001-01` | 章节修订 |
| `world` | `WLD-0001` | 世界观 |
| `character` | `CHR-0001` | 人物 |
| `organization` | `ORG-0001` | 组织势力 |
| `location` | `LOC-0001` | 地点场所 |
| `item` | `ITM-0001` | 道具技术 |
| `ability` | `ABL-0001` | 能力体系 |
| `term` | `TRM-0001` | 术语 |
| `event` | `EVT-0001` | 客观事件 |
| `milestone` | `MLS-0001` | 剧情里程碑 |
| `foreshadowing` | `FSH-0001` | 伏笔 |
| `mystery` | `MYS-0001` | 悬念 |
| `information_gap` | `INF-0001` | 信息差 |
| `task` | `TSK-0001` | 新创作任务 |
| `quality_issue` | `QA-0001` | 质量问题 |
| `important_change` | 既有 ID 或无；P0 不分配新前缀 | 重要变更记录 |
| `template` | 既有 ID 或无；P0 不分配新前缀 | 模板 |
| `project_state` | 无 | 单项目当前状态文件 |
| `suggestion_decision_log` | 无 | 系统建议决策日志 |

正式 ID 匹配 `PREFIX-[0-9]{4,}`；`REV-CH` 匹配 `REV-CH-[0-9]{4,}-[0-9]{2,}`。既有非标准但稳定 ID 保留并产生 `STRUCT_ID_FORMAT_NONSTANDARD`，不得自动改写。新 ID 取项目内对应前缀最大数字加一，并在提交写入前重新查重。

### 3.2 公共记录

```ts
interface EntityRecord<TData> {
  key: string;
  id?: string;
  type: EntityType | 'unknown';
  title: string;
  aliases: string[];
  canon: CanonStatus | 'unknown';
  lifecycleStatus: LifecycleStatus | 'unknown';
  contextScope: ContextScope | 'unknown';
  reviewStatus: ReviewStatus | 'unknown';
  lastReviewed?: string;
  source: SourceLocation;
  relatedFiles: string[];
  links: EntityLink[];
  data: TData;
  raw: Record<string, unknown>;
  diagnostics: DiagnosticRef[];
}
```

缺失的公共治理字段在读模型中采用显示默认值 `canon / active / current / pending_review`，同时记录字段缺失来源；未知显式值必须归一为 `unknown`、保留 `raw` 并产生 `ENUM_UNKNOWN`，不得静默套用默认值。

`EntityLink` 必须包含 `type`、`fromKey`、`toRef`、`direction`、`source`，可选 `validFrom`、`validTo`、`evidence`、`canon`。无法解析的目标仍保留 link，并产生诊断。

### 3.3 类型专属字段

| 类型 | P0 规范字段 |
|---|---|
| 叙事层级 | `parent_ids[]`、`book`、`part`、`volume`、`unit`、`order` |
| plan | 上述层级字段、`chapter_ids[]`、`event_ids[]`、`pov[]`、`intent`、`must_deliver[]`、`must_avoid[]` |
| chapter | 层级字段、`chapter_no`、`revision_ids[]`、`event_ids[]`、`status`、`synopsis`、`pov[]` |
| chapter_revision | `chapter_id`、`revision_no`、`publication_status`、`supersedes` |
| character | `role`、`faction_ids[]`、`current_location_id`、`story_status`、`desires[]`、`weaknesses[]`、`secrets[]`、`knowledge_boundaries[]`、`related_character_ids[]`、`event_ids[]`、`chapter_ids[]`、`reader_visible` |
| item | `origin`、`uses[]`、`abilities[]`、`limitations[]`、`current_holder_ids[]`、`current_location_id`、`holder_history[]`、`transfer_event_ids[]`、`chapter_ids[]`、`reader_visible`、`world_rule_ids[]`、`ability_ids[]` |
| event | 第 7 节定义的 `EventData` |
| milestone | 第 9 节定义的 `MilestoneData` |
| task | 第 10 节定义的 `CreativeTaskData` |
| foreshadowing | `truth_event_ids[]`、`plant_before[]`、`advance_when[]`、`reveal_after[]`、`status` |
| 其他设定 | 公共字段、类型专属标量/ID 列表、`event_ids[]`、`chapter_ids[]` |

## 4. 字段映射

### 4.1 内建公共别名

| 规范字段 | 接受的 Properties/旧字段 |
|---|---|
| `type` | `type`, `对象类型`, `类型` |
| `id` | `id`, `ID`, `永久ID`, `永久_id` |
| `title` | `title`, `name`, `标题`, `名称`；最后回退 H1/basename |
| `aliases` | `aliases`, `alias`, `别名`, `Alias` |
| `canon` | `canon`, `权威状态`, `正式状态` |
| `lifecycle_status` | `lifecycle_status`, `lifecycle`, `生命周期` |
| `context_scope` | `context_scope`, `上下文范围` |
| `review_status` | `review_status`, `审核状态`, `复核状态` |
| `related_files` | `related_files`, `相关文件`, `补充材料` |
| `last_reviewed` | `last_reviewed`, `最后检查`, `最近复核` |
| `synopsis` | `synopsis`, `Synopsis`, `摘要` |
| `status` | `status`, `Status`, `状态` |

项目级 `field_aliases` 只能追加别名，按“规范名 -> 项目别名顺序 -> 内建别名顺序”解析。多个别名同时存在且值不同产生 `FIELD_ALIAS_CONFLICT`；不自动选择覆盖，规范名存在时用于读模型，其余值保留在 `raw`。

### 4.2 类型别名

英文 ID 前缀和英文规范 type 优先。内建兼容：`character/人物 -> character`、`event/事件 -> event`、`chapter/正文/章节 -> chapter`、`plan/策划 -> plan`、`milestone/里程碑 -> milestone`、`task/创作任务 -> task`、`foreshadowing/伏笔 -> foreshadowing`。无法映射为 `unknown`。

## 5. 权威数据位置

| 数据 | 权威端 | 兼容/派生端 |
|---|---|---|
| 项目 root、目录映射、字段别名、性能阈值 | 插件设置 `consoleProjects[]` | 默认配置 |
| 当前焦点、多线游标 | `<control>/当前阶段.md` | UI/索引投影 |
| 新事件事实、时间、关系、章节映射、时间轴权重 | `EVT-*` Markdown | 章节旧 `timeline/events` 只读输入与反向投影 |
| 里程碑条件与正式状态 | `MLS-*` Markdown | evaluator 派生 `completion_ready` |
| 新创作任务 | `TSK-*` Markdown | 总览 ActionItem |
| 旧限时任务 | 既有任务 Markdown | 只读 `LegacyTimedTaskAdapter` ActionItem |
| 伏笔新锚点 | `FSH-*` Markdown | 旧伏笔块只读展示 |
| 建议 | IndexSnapshot 派生 | 不直接落盘 |
| 建议决策 | `<control>/建议决策.md` | 最新记录派生当前决策 |
| 上下文选择结果 | `<context>/current-context.md/.json` | 可重新生成 |
| 实体/关系/全文索引 | 插件数据目录缓存 | 必须可从 Markdown 重建 |
| 审计 | 插件数据目录轻量日志 | 不保存正文全文 |

旧 Manager 继续拥有旧格式写入权；新 application command 只写新格式。任何字段只能有一个新格式权威端。

## 6. 枚举与状态转换

### 6.1 枚举

- `canon`: `canon | candidate | conflict`
- `lifecycle_status`: `active | deprecated | archived`
- `context_scope`: `current | history | test | draft`
- `review_status`: `author_confirmed | pending_review`
- `event_status`: `planned | possible | occurring | occurred | cancelled | superseded`
- `narrative_status`: `unassigned | outlined | chapter_assigned | writing | written | published`
- `reader_state`: `unknown | hinted | partial | misled | revealed`
- `task_status`: `planned | active | blocked | completed | cancelled`
- `milestone_status`: `planned | active | completed | cancelled`
- `foreshadowing_status`: `planned | planted | advanced | revealed | abandoned`
- `activation.relation`: `before | approaching | at | after | between | blocked_by`
- `importance`: `minor | normal | major | critical`
- `health severity`: `error | warning | suggestion | author_confirmation`
- `index status`: `idle | indexing | degraded | error`

所有解析枚举都有 `unknown` 读模型分支。`unknown` 不能作为新写入值。

### 6.2 允许转换

| 状态族 | 允许转换 | 附加约束 |
|---|---|---|
| canon | `candidate -> canon/conflict`; `conflict -> candidate/canon`; `canon -> conflict` | 全部需预览确认；`canon -> candidate` 不允许，改用 conflict 或 lifecycle |
| lifecycle | `active <-> deprecated`; `active/deprecated <-> archived` | 正式资料转废弃/归档需预览；恢复不得自动恢复旧关系 |
| review | `pending_review <-> author_confirmed` | 只由作者操作 |
| event | `possible -> planned/cancelled/superseded`; `planned -> possible/occurring/occurred/cancelled/superseded`; `occurring -> occurred/cancelled`; `occurred -> superseded`; `cancelled -> planned`; `superseded -> planned` | 进入 `occurred` 必须预览；`occurring` 必须有开始时间；取消/替代不改知识状态 |
| narrative | 相邻前进或回退；任意非 published -> `published`；`published -> written` | 进入/退出 published 必须预览；不改 event/reader |
| reader | 任意值到任意其他值 | 作者确认；不得由 event 状态推断 |
| task | `planned -> active/blocked/cancelled`; `active -> blocked/completed/cancelled`; `blocked -> active/completed/cancelled`; `completed/cancelled -> active` | 恢复任务需预览，旧限时任务不走此状态机 |
| milestone | `planned -> active/cancelled`; `active -> completed/cancelled`; `completed/cancelled -> active` | completed 必须作者确认；条件只产生 ready |
| foreshadowing | `planned -> planted/abandoned`; `planted -> advanced/revealed/abandoned`; `advanced -> advanced/revealed/abandoned`; `revealed/abandoned -> planted` | 系统只建议，不自动转换 |

## 7. 时间、事件与时间轴

```ts
interface StoryTime {
  display: string;
  sortKey?: string;
  calendar?: string;
  precision: 'instant' | 'day' | 'month' | 'season' | 'year' | 'era' | 'relative' | 'unknown';
}
```

`EventData` 至少包含：`eventStatus`、`narrativeStatus`、`readerState`、`storyTime?`、`storyTimeEnd?`、`timelineOrder?`、`storyline`、`prerequisiteEventIds[]`、`currentPlanIds[]`、`currentChapterIds[]`、`characterIds[]`、`organizationIds[]`、`locationIds[]`、`itemIds[]`、`timelineViews`、`knowledgeState`、`causes[]`、`results[]`、`longTermImpacts[]`、`evidenceFiles[]`。

排序只在同一 calendar 且 sortKey 可比时比较 `sortKey`，否则以 `timelineOrder` 辅助、分组显示并产生不可比较提示。跨 calendar 不伪造映射。`occurring` 必须有 `storyTime`；结束未知允许 `storyTimeEnd = null`。

`timelineViews`：

```yaml
reality: { visible: true, importance: major }
hidden_world: { visible: true, importance: critical }
cosmic: { visible: false, importance: normal }
characters: { CHR-0001: major }
organizations: { ORG-0003: minor }
```

修改一个 view key 只能产生该 key 的字段 diff，不得重写其他视图权重。

## 8. 位置编码

`story_code` 是由关系计算的动态显示值，顺序固定为 `P{part}-V{volume}-U{unit}-C{chapter}`，跳过缺省层级，数字分别补足 2/2/2/3 位。例如 `P01-V02-U03-C012`、`V02-C012`、`C012`。默认不写回；需要持久化时必须预览。`project_code` 只在多作品聚合 UI 中作为显示前缀，不进入关系键或单项目 story_code。

## 9. 里程碑与游标算法

`MilestoneData`：`storyline`、`status`、`completion`、`relatedPartIds[]`、`relatedVolumeIds[]`、`relatedUnitIds[]`。`completion` 是判别联合：

- `all(requiredEventIds[])`：全部 `occurred`；
- `any(requiredEventIds[])`：至少一个 `occurred`；
- `sequence(requiredEventIds[])`：全部 `occurred` 且事件规范排序与列表顺序一致；不可比较即为 `indeterminate`；
- `manual(requiredEventIds[]?)`：始终返回 `manual_review`。

求值结果：`not_ready | completion_ready | indeterminate | manual_review`。任何结果都不直接写 `completed`。

项目状态文件固定结构：`schema_version`、唯一 `current_focus`、`storyline_cursors: Record<storyline,eventId>`。`current_focus` 取一个正式 ID 或 YAML `null`；`null` 表示“无焦点”，不删除状态文件且保留全部故事线游标。文件不存在显示“未配置”，只允许由作者点击后经预览创建。该可空语义于 2026-09-11 经用户批准，用于支持显式清除焦点。

图距离：在同一 storyline 的事件依赖有向图中，从当前 cursor 沿“前置 -> 后继”边做 BFS，最短边数为距离；默认阈值 2，项目可配置 1–5。环、跨线、缺边、不可达均返回带 reason 的非数值结果，禁止猜测。

## 10. 创作任务、激活与建议

`CreativeTaskData` 包含 `taskKind`、`status`、`priority`、`relatedObjectIds[]`、`activation`、`blockedByIds[]`、`dueAt?`。关联对象与激活锚点必须分开。

`activation`：

- `before/approaching/at/after`: 单一 `anchorId`；
- `between`: `startAnchorId` 与 `endAnchorId`；
- `blocked_by`: `blockerIds[]`，目标可为 TSK 或 EVT。

行动分组按以下优先顺序求值：无效锚点 -> `needs_confirmation`；已完成/取消 -> 不显示；阻塞未解除或 `at` 当前锚点或已满足 `after` 或 `before` 距离 0 -> `now`；`approaching` 或 `before` 且距离 1..threshold -> `upcoming`；同线规范顺序已越过且未完成 -> `missed`；其余 -> `later`。历史、隐藏世界、宇宙历史或非当前线事件不能仅凭 `occurred` 激活。

Suggestion 身份为确定性字符串：`SUG:<ruleId>:<targetKey>:<anchor-or-none>`。同一快照中相同身份只出现一次。Suggestion 本身不持久化；作者决策追加到 `<control>/建议决策.md`：

```yaml
type: suggestion_decision_log
schema_version: 1
decisions:
  - suggestion_id: SUG:PROG_TASK_ANCHOR_PASSED:TSK-0001:EVT-0009
    rule_id: PROG_TASK_ANCHOR_PASSED
    target_key: TSK-0001
    decision: snoozed
    decided_at: 2026-09-09T12:00:00+08:00
    snooze_until_anchor: EVT-0012
    resulting_task_id: null
    rationale: "等待支线汇合"
```

决策枚举：`handled | converted_to_task | snoozed | ignored_once | not_applicable`。只有 `converted_to_task` 分配并创建新的 `TSK-*`，且必须通过 ChangePlan。日志以 suggestion_id 的最后一条有效记录为当前决策，保留历史以便审计。

## 11. 健康规则目录

每项结果包含稳定 `ruleId`、severity、entityKey、evidence[]、message、suggestion、`autoFixKind?`。P0 稳定 rule ID：

| 分组 | Rule ID |
|---|---|
| 结构 | `STRUCT_ID_DUPLICATE`, `STRUCT_ID_MISSING`, `STRUCT_ID_TYPE_MISMATCH`, `STRUCT_ID_FORMAT_NONSTANDARD`, `STRUCT_WIKILINK_BROKEN`, `STRUCT_CORE_ORPHANED`, `STRUCT_DIRECTORY_STATUS_MISMATCH`, `STRUCT_CANON_REFERENCES_DEPRECATED`, `STRUCT_CONTEXT_SCOPE_LEAK`, `STRUCT_REVIEW_STALE`, `STRUCT_MANUSCRIPT_UNKNOWN_REFERENCE`, `STRUCT_FIELD_ALIAS_CONFLICT`, `STRUCT_ENUM_UNKNOWN` |
| 事件/连续性 | `EVENT_TIME_MISSING`, `EVENT_TIME_CONFLICT`, `EVENT_DEPENDENCY_MISSING`, `EVENT_DEPENDENCY_CYCLE`, `EVENT_CURRENT_PREREQUISITE_MISSING`, `EVENT_CHAPTER_PREREQUISITE_UNMET`, `EVENT_CROSSLINE_JOIN_UNMET`, `MILESTONE_EVENT_MISSING`, `MILESTONE_DEPENDENCY_CYCLE`, `CONTINUITY_CHARACTER_LOCATION_CONFLICT`, `CONTINUITY_CHARACTER_STATE_REVIEW`, `CONTINUITY_ITEM_MULTIPLE_HOLDERS`, `CONTINUITY_ITEM_OWNERSHIP_REVIEW`, `CONTINUITY_KNOWLEDGE_REVIEW`, `CONTINUITY_CHAPTER_EVENT_MAPPING_BROKEN` |
| 推进 | `PROG_FORESHADOWING_OVERDUE`, `PROG_FORESHADOWING_ANCHOR_PASSED`, `PROG_TASK_ANCHOR_PASSED`, `PROG_ACTIVATION_ANCHOR_INVALID`, `PROG_HIDDEN_HISTORY_TASK_ACTIVATED`, `PROG_SUGGESTION_IGNORED_RELEVANT` |

允许自动修复仅为：`rebuild_cache`、`delete_derived_cache`、`regenerate_context`、`remove_stale_generated_entry`。补 ID、改链接、改任何事实/知识/游标/任务/权威状态只能生成 ChangePlan 并由作者确认。

## 12. Context MD/JSON Schema

`ContextPlan` 包含 `schemaVersion`、`target`、`generatedAt`、`snapshotVersion`、`policy`、`items[]`、`conflicts[]`。每个 item 必须包含：`key/id/path/anchor/type/title`、`inclusion: auto_included|manual_included|manual_excluded`、`reasons[]`、`relationship`、四个治理状态、`containsUnrevealed`、`knowledgeBoundary`、`hasConflict`、`modifiedAt`、`lastReviewed?`、`summary`。

默认过滤顺序：manualExcluded 胜出；直接手动纳入可覆盖 candidate/history/test/draft/deprecated，但输出必须显著标记；自动规则默认只纳入 `canon + active + current`，archived 永不自动纳入。关系默认深度 1，事件前置链最多 2，禁止无限递归。

JSON 是稳定机器格式，顶层 `schemaVersion` 必须为 `console.context.v1`。Markdown 是同一 ContextPlan 的人类投影，固定章节顺序：元数据、目标、策略与知识边界、自动纳入、手动纳入、手动排除、冲突与警告。MD 与 JSON 使用同一 planId，通过临时写入与双文件替换作为一个逻辑事务；任一失败不发布半套新输出并保留上一版。

默认路径：`<context>/current-context.md` 与 `<context>/current-context.json`；项目映射可改目录，不可改变文件 schema。机器格式见 `doc/console-v0.21/schemas/context-v1.schema.json`，Markdown 投影见同目录 `context-v1.md`。

## 13. ChangePlan、ImpactReport 与审计

```ts
interface ChangePlan {
  schemaVersion: 'console.change-plan.v1';
  planId: string;
  command: { type: string; actor: 'author'; requestedAt: string; targetKeys: string[] };
  snapshotVersion: string;
  risk: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  files: FileChange[];
  fieldDiffs: FieldDiff[];
  relationDiffs: RelationDiff[];
  warnings: string[];
}
```

`FileChange` 必须含 `path`、`operation(create|modify|move|rename|delete)`、期望 `mtime/contentHash`、目标路径（如有）和恢复策略；正文全文只在执行期内存快照存在，不进入审计。

`ImpactReport` 固定包含受影响的入/出链、事件、任务、伏笔、人物、物品、知识状态、章节、上下文、健康项、新增 now/missed 行动、重要变更建议与不可判断风险。空类别也要以空数组显式出现。

高风险操作清单以需求第 21.1 章为准；其 `requiresConfirmation` 必须为 true，执行 API 必须要求与 planId 绑定的一次性 confirmation token。执行前逐文件校验 path + mtime + contentHash，稳定路径顺序写入；失败时逆序补偿。补偿遇到外部修改立即停止覆盖并产生人工恢复报告。

审计 `console.audit.v1` 只保存：auditId、planId、commandType、actor、时间、targetKeys、paths、字段级 diff、结果、错误码、补偿结果、snapshotBefore/After。不得保存不必要的正文全文或内存备份。

## 14. 索引与增量契约

管线固定为 `ProjectScopeResolver -> SourceClassifier -> adapters -> IdRegistry/RelationIndex/FullTextIndex -> health rules -> immutable IndexSnapshot`。create/modify 只重解析单文件；delete 删除其贡献并重算引用者；rename/move 保留 ID 关系、更新 source 与 Wikilink；只有项目映射变化、缓存不兼容/损坏才允许项目级全量重建。

缓存删除或损坏后，规范化实体与关系结果必须等价重建。索引状态为 `idle/indexing/degraded/error`，UI 显示进度、失败文件、快照时间。

性能冻结初值：10,000 Markdown 首次后台索引 <= 30s；每 50 文件主动让出事件循环；单文件修改可查询 P95 <= 500ms；已有索引普通搜索 P95 <= 100ms。若真实设备不满足，只能通过 P0-073 形成带设备证据的范围变更，不能静默放宽。

## 15. 项目配置

插件设置新增 `consoleProjects[]`：`projectId`、`projectCode`、`root`、`directories`、`fieldAliases`、`activationDistance(1..5, default 2)`、`contextDepth(default 1)`、`eventPrerequisiteDepth(default 2)`、`performance`。默认逻辑目录为 control/叙事/正文/设定/事件/素材/context，但所有物理名称可配置，不得在 Manager/UI 中硬编码。

若项目没有 `AGENTS.md` 上下文路径约定，采用第 12 节默认 MD+JSON 路径。真实 Vault 的字段与目录分布只通过配置/fixture 校准，不改变规范语义。

## 16. P0 验收追踪矩阵

`doc/console-v0.21/acceptance-matrix.md` 是本规范的规范性附件，32 条 AC 必须全部有自动测试或可复现手工证据。条件项不得阻塞 P0；建议项不得冒充必做项。未经作者批准，不得删除、合并或弱化 AC。

## 17. 变更控制

任何规范变更必须记录：变更原因、受影响字段/算法/AC、兼容与迁移方式、批准人、批准时间、schema 是否升级。仅修正文案且不改变语义可增加 patch 记录；字段、枚举、权威端、算法或写入安全边界变化必须提升 schema 版本。
