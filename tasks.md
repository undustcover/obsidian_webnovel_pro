# 小说控制台 V0.21 P0 原子任务账本

规则：按依赖顺序执行；每项限制在一次清晰编码会话内。完成后必须勾选，并在“完成记录”填写实际修改、测试结果、遗留问题和后续影响。字段与算法只能引用 `spec.md`，不得在任务中另建规范。

## Wave 0：基线与规格冻结

- [x] P0-001 恢复依赖并建立基线
  - 依赖：无
  - 修改文件：无源码修改
  - 新增文件：`doc/console-v0.21/baseline.md`
  - 输入：`package-lock.json`、现有 scripts 与 tests
  - 输出：type-check、lint、test、coverage 的可复现结果
  - 不做：不运行 `npm audit fix`，不把既有 stderr 当改造失败
  - 单元测试：现有 55 个测试文件
  - 集成验收：四项基线命令退出码 0
  - 完成证据：`doc/console-v0.21/baseline.md`
  - 完成记录：npm ci 安装 580 包；type-check/lint 通过；951/951 tests 通过；覆盖率 68.79/76.16/77.76/68.79；遗留 8 个依赖漏洞和 2 条剪贴板建议，不阻塞后续

- [x] P0-002 建立 32 条需求验收追踪矩阵
  - 依赖：无
  - 修改文件：`spec.md`
  - 新增文件：`doc/console-v0.21/acceptance-matrix.md`
  - 输入：需求报告第 26 章、审查文档发布闸门
  - 输出：AC-01..AC-32 的 owner、方法、证据位置、状态
  - 不做：不合并或弱化验收项
  - 单元测试：不适用
  - 集成验收：32/32 行均可反向追踪
  - 完成证据：验收矩阵文件
  - 完成记录：已建立 32 行；AC-30 标记进行中，其余未开始；后续每项必须更新状态

- [x] P0-003A 建立最小新格式 Vault fixture
  - 依赖：P0-001
  - 修改文件：无
  - 新增文件：`tests/fixtures/console/minimal/**`
  - 输入：spec 的实体、稀疏层级、项目状态示例
  - 输出：省略 PART/UNIT 的 7-ID happy-path Vault
  - 不做：不伪造缺省层级
  - 单元测试：fixture manifest 与后续 adapter tests
  - 集成验收：动态位置编码应为 `V01-C001`
  - 完成证据：minimal `fixture.json`
  - 完成记录：已创建 project state、BOOK/VOL/PLN/CH/CHR/EVT/MLS/TSK 样本；后续由 P0-012/016 消费

- [x] P0-003B 建立混合旧格式 Vault fixture
  - 依赖：P0-001
  - 修改文件：无
  - 新增文件：`tests/fixtures/console/mixed-legacy/**`
  - 输入：旧 Manager 测试中的真实 Markdown 格式
  - 输出：旧章节/H2 设定/时间线/伏笔/限时任务与新 Properties 混合样本
  - 不做：不把 legacy key 写入 Markdown
  - 单元测试：后续 adapter contract tests
  - 集成验收：包含重复 ID、缺 ID、未知枚举、坏链接、坏锚点
  - 完成证据：mixed-legacy `fixture.json`
  - 完成记录：已创建全部指定旧格式和诊断触发样本；后续 P0-013/014/059 复用

- [x] P0-003C 建立确定性 10k Vault fixture
  - 依赖：P0-001
  - 修改文件：无
  - 新增文件：`tests/fixtures/console/large/generator.ts`、`fixture.json`、`tests/console/fixtures.test.ts`
  - 输入：10k/50-batch 性能基线
  - 输出：可在临时目录物化的 10,000 文件生成器
  - 不做：不提交 10,000 个派生 Markdown
  - 单元测试：数量、路径唯一性、二次生成等价、非法数量
  - 集成验收：分布 7000 CH/2000 EVT/800 CHR/200 TSK
  - 完成证据：2/2 fixture tests 通过
  - 完成记录：生成器确定性测试通过；P0-073 再物化并记录设备 benchmark

- [x] P0-004A 冻结 schema v1、权威端与枚举
  - 依赖：无
  - 修改文件：无
  - 新增文件：`spec.md`、`src/console/domain/schema.ts`
  - 输入：需求报告第 11–21、29 章与审查文档第 6 章
  - 输出：实体 Schema、字段映射、权威位置、枚举、状态转换
  - 不做：不依据 UI 便利改变事实语义
  - 单元测试：由 P0-010 覆盖常量和未知值
  - 集成验收：第 29 章 18 项均有确定答案
  - 完成证据：Frozen `spec.md`
  - 完成记录：已冻结 `console.schema.v1`；真实 Vault 差异走配置/诊断或范围变更

- [x] P0-004B 冻结领域算法与写入格式
  - 依赖：P0-004A
  - 修改文件：`spec.md`
  - 新增文件：`src/console/domain/{events,milestones,tasks,knowledge,changes}.ts`
  - 输入：需求里程碑、激活、上下文、安全写入条款
  - 输出：算法、Suggestion 身份/决策日志、健康 Rule ID、Context/ChangePlan/Impact/Audit 格式
  - 不做：不实现运行时 repository 或写入
  - 单元测试：类型检查；领域常量测试
  - 集成验收：未知事实不猜测，高风险确认边界明确
  - 完成证据：`spec.md` 第 7–14 节；type-check 通过
  - 完成记录：格式与边界已冻结；Context JSON Schema 与 Markdown 投影模板已落盘，P0-038 只实现 renderer/repository

- [x] P0-005 从第 6、8 章抽取代码实施计划
  - 依赖：P0-004B
  - 修改文件：无
  - 新增文件：`plan.md`
  - 输入：审查文档第 6、8 章、现有 ServiceRegistry/Bootstrapper/ViewManager
  - 输出：文件、注册、生命周期、边界、事件流、路由、Wave、回滚和放行计划
  - 不做：不重复 spec 字段定义
  - 单元测试：不适用
  - 集成验收：所有 Wave 有集成点、演示、放行条件
  - 完成证据：`plan.md`
  - 完成记录：已完成；后续若代码现实变化只修实施细节，不改 spec

- [x] P0-006 将第 7 章转为原子任务账本
  - 依赖：P0-005
  - 修改文件：无
  - 新增文件：`tasks.md`
  - 输入：审查文档第 7 章、用户任务模板
  - 输出：依赖、文件、输入输出、非目标、测试、验收、证据与完成记录
  - 不做：不以对话状态代替文件状态
  - 单元测试：不适用
  - 集成验收：P0-001..075 均可追踪
  - 完成证据：本文件
  - 完成记录：已完成首版；每次编码会话持续更新

## Wave 1：领域、配置与索引基础

- [x] P0-010 建立公共实体、关系、来源与诊断类型
  - 依赖：P0-004
  - 修改文件：无
  - 新增文件：`src/console/domain/{entities,relations,diagnostics,normalization,index}.ts`、`tests/console/domain.test.ts`
  - 输入：`spec.md` 第 2、3、6、11 节
  - 输出：纯 TypeScript 公共模型、legacy key、ID shape、unknown 枚举路径
  - 不做：不导入 Obsidian/DOM，不实现 adapter 或索引
  - 单元测试：默认治理值、unknown 保留、legacy key、普通/复合 ID、Suggestion ID
  - 集成验收：type-check 通过；5/5 domain tests 通过
  - 完成证据：领域源码与测试
  - 完成记录：已实现并验证；遗留为 P0-011 配置和 P0-012 adapter，不影响后续依赖

- [x] P0-011 扩展项目配置与设置迁移
  - 依赖：P0-004
  - 修改文件：`src/types/settings.ts`、`src/constants.ts`、`src/core/SettingsManager.ts`、`src/ui/SettingsTab.ts`
  - 新增文件：`src/console/config/projectConfig.ts`、`tests/console/project-config.test.ts`
  - 输入：spec 第 5、15 节；旧 `workspaceFolders/loreFolderName`
  - 输出：`consoleProjects` 校验、旧设置无损内存迁移、设置 UI
  - 不做：不写 Vault，不重命名旧目录/设置 key
  - 单元测试：默认值、坏条目降级、多作品、距离范围 1–5
  - 集成验收：旧 data.json 加载结果不丢字段
  - 完成证据：测试与设置迁移快照
  - 完成记录：已加入 `consoleProjects`、默认派生/校验、多项目设置 UI 与旧 data.json 兼容测试；不写 Vault，修改后重载生效

- [x] P0-012A 实现公共 Properties 字段解析
  - 依赖：P0-010、P0-011
  - 修改文件：无
  - 新增文件：`src/console/adapters/fieldResolver.ts`、`tests/console/adapters/field-resolver.test.ts`
  - 输入：spec 第 4 节 field aliases
  - 输出：规范名/项目别名/内建别名解析及 raw/source trace
  - 不做：不按默认值覆盖显式未知值
  - 单元测试：中文/英文/历史别名、冲突、数组/标量、未知值
  - 集成验收：mixed fixture 产生稳定 `FIELD_ALIAS_CONFLICT/ENUM_UNKNOWN`
  - 完成证据：contract test
  - 完成记录：已实现 canonical > project alias > built-in alias 的确定性解析、冲突证据及数组/标量规范化

- [x] P0-012B 实现新 PropertiesEntityAdapter
  - 依赖：P0-012A
  - 修改文件：无
  - 新增文件：`src/console/adapters/PropertiesEntityAdapter.ts`、类型 fixture tests
  - 输入：fieldResolver、P0 全部实体 schema
  - 输出：规范化 EntityRecord 与 links/diagnostics
  - 不做：不写 Markdown，不扫描 scope 外文件
  - 单元测试：每一 P0 类型、坏 frontmatter、unknown type、来源哈希
  - 集成验收：minimal 全类型可解析且原值可追溯
  - 完成证据：adapter test matrix
  - 完成记录：已覆盖全部 P0 canonical type、未知枚举、raw/source trace、正文检索数据和 ID 关系抽取；不执行写入

- [x] P0-013A 实现旧章节 adapter
  - 依赖：P0-010、P0-003
  - 修改文件：无
  - 新增文件：`src/console/adapters/LegacyChapterAdapter.ts`、对应测试
  - 输入：旧章节识别、Synopsis/Status/timeline/正文
  - 输出：无 ID legacy chapter 记录及兼容 links
  - 不做：不补 ID、不改 frontmatter
  - 单元测试：根/分卷章节、别名字段、坏 Markdown
  - 集成验收：旧章节可展示且 key 稳定
  - 完成证据：mixed fixture golden
  - 完成记录：已实现根/分卷均可用的只读章节投影，保留 synopsis/status/timeline，不补正式 ID

- [x] P0-013B 实现旧设定单文件与 H2 adapter
  - 依赖：P0-010、P0-003
  - 修改文件：无
  - 新增文件：`src/console/adapters/LegacyLoreAdapter.ts`、对应测试
  - 输入：CharacterManager 的路径、H2、Alias 解析契约
  - 输出：file/H2 两种只读 legacy 实体
  - 不做：不以名称作为正式 ID，不依赖 Manager 缓存作为事实
  - 单元测试：别名、锚点、同名冲突、单文件
  - 集成验收：结果与现有 CharacterManager fixture 语义一致
  - 完成证据：adapter parity tests
  - 完成记录：已实现单文件/H2 稳定 legacy key、锚点与别名解析；同名仍由 source anchor 区分且不冒充正式 ID

- [x] P0-014A 实现旧时间线 adapter
  - 依赖：P0-010、P0-003
  - 修改文件：无
  - 新增文件：`src/console/adapters/LegacyTimelineAdapter.ts`、测试
  - 输入：现代项目符号与旧无项目符号时间线
  - 输出：只读 legacy event 投影
  - 不做：不伪造 EVT ID、不修改章节 timeline
  - 单元测试：时间/type/chapter/origin/multiline
  - 集成验收：与 TimelineManager fixture 一致
  - 完成证据：parity tests
  - 完成记录：已实现现代项目符号及旧无项目符号区块的只读 event 投影，保留时间、章节与描述

- [x] P0-014B 实现旧伏笔 adapter
  - 依赖：P0-010、P0-003
  - 修改文件：无
  - 新增文件：`src/console/adapters/LegacyForeshadowingAdapter.ts`、测试
  - 输入：旧引用、标签、状态、阶段/终结日志
  - 输出：只读 legacy foreshadowing
  - 不做：不推断稳定事件锚点
  - 单元测试：多引用、多阶段、旧单回收字段
  - 集成验收：与 ForeshadowingManager fixture 一致
  - 完成证据：parity tests
  - 完成记录：已解析旧引用、标签、状态和阶段/终结回收日志，不推断 EVT 锚点

- [x] P0-014C 实现旧限时任务 adapter
  - 依赖：P0-010、P0-003
  - 修改文件：无
  - 新增文件：`src/console/adapters/LegacyTimedTaskAdapter.ts`、测试
  - 输入：日期/期数/字数/事件旧任务
  - 输出：只读日期驱动 ActionItem
  - 不做：不创建 TSK、不改变旧状态
  - 单元测试：中英文标签、字数/事件、状态映射
  - 集成验收：与 TaskManager fixture 一致
  - 完成证据：parity tests
  - 完成记录：已将旧期数/平台/任务/状态投影为无正式 ID 的只读 task record，不改变旧任务状态

- [x] P0-015A 实现 IdRegistry
  - 依赖：P0-010、P0-012
  - 修改文件：无
  - 新增文件：`src/console/indexing/IdRegistry.ts`、测试
  - 输入：规范化 records 与 spec ID 映射
  - 输出：id->records、source->id、重复/缺失/类型/格式诊断、next candidate
  - 不做：不写回、不为 legacy 分配 ID
  - 单元测试：重复、复合 ID、非标准稳定 ID、提交前占用
  - 集成验收：mixed fixture 诊断确定
  - 完成证据：registry tests
  - 完成记录：已实现 ID/source 注册、重复/类型/格式诊断和简单 ID next candidate；REV-CH 需章节上下文，明确不在此盲分配

- [x] P0-015B 实现 StoryCodeService
  - 依赖：P0-010、P0-012
  - 修改文件：无
  - 新增文件：`src/console/indexing/StoryCodeService.ts`、测试
  - 输入：叙事关系与编号
  - 输出：跳级 story_code 和排序片段
  - 不做：不默认持久化、不加入 project_code
  - 单元测试：完整/缺 PART/缺 UNIT/仅 CH/坏关系
  - 集成验收：minimal 为 `V01-C001`
  - 完成证据：table-driven tests
  - 完成记录：已实现稀疏 PART/VOL/UNIT/CH 编码及非法编号拒绝，验证 `V02-C012` 与完整组合

- [x] P0-016A 实现 scope、classifier 与 adapter registry
  - 依赖：P0-012、P0-013、P0-014、P0-015
  - 修改文件：无
  - 新增文件：`src/console/indexing/{ProjectScopeResolver,SourceClassifier}.ts`、`src/console/adapters/registry.ts`
  - 输入：project mappings、Markdown files、adapter capabilities
  - 输出：限界候选和确定性 adapter 选择
  - 不做：不全 Vault 无界扫描、不写文件
  - 单元测试：多项目、重叠 root、功能文件、未知文件
  - 集成验收：只处理目标 project
  - 完成证据：scope/classifier tests
  - 完成记录：已实现路径边界 scope、确定性 adapter registry/classifier；多项目分别扫描各自 scope

- [x] P0-016B 实现统一索引初建与不可变快照
  - 依赖：P0-016A
  - 修改文件：无
  - 新增文件：`src/console/indexing/{EntityIndexService,IndexSnapshot}.ts`、测试
  - 输入：scope 内文件、adapters、IdRegistry
  - 输出：原子发布实体/诊断 snapshot
  - 不做：不因单文件失败终止、不暴露构建中 Map
  - 单元测试：坏文件隔离、版本、排序确定性、write spy=0
  - 集成验收：minimal/mixed 首扫零 Markdown 写入
  - 完成证据：initial-index tests
  - 完成记录：已实现批次主动让出事件循环、单文件失败隔离、构建完成后原子发布 snapshot；首扫端口仅定义读取能力

- [x] P0-017A 实现关系索引
  - 依赖：P0-016
  - 修改文件：无
  - 新增文件：`src/console/indexing/RelationIndex.ts`、测试
  - 输入：EntityRecord.links
  - 输出：入链、出链、坏目标、受影响引用者
  - 不做：不自动修复坏关系
  - 单元测试：方向、多边、legacy/ID、删除贡献
  - 集成验收：chapter<->event 反向投影正确
  - 完成证据：relation tests
  - 完成记录：已实现入链/出链与目标引用者查询，关系只投影不自动修复

- [x] P0-017B 实现全文索引与统一查询
  - 依赖：P0-017A
  - 修改文件：无
  - 新增文件：`src/console/indexing/FullTextIndex.ts`、`src/console/application/EntityQuery.ts`、测试
  - 输入：snapshot、query/filter/sort/page DTO
  - 输出：标题/别名/ID/正文与字段组合检索
  - 不做：不向 UI 暴露 adapter
  - 单元测试：组合筛选、稳定排序、分页、中文/英文 token
  - 集成验收：AC-09 条件全覆盖
  - 完成证据：search tests
  - 完成记录：已实现标题/别名/ID/正文/字段检索、组合过滤、稳定排序分页及 `EntityQuery` 应用边界

- [x] P0-018 实现索引缓存、恢复和状态
  - 依赖：P0-016
  - 修改文件：`src/core/ServiceRegistry.ts`、`src/core/PluginBootstrapper.ts`
  - 新增文件：`src/console/indexing/{IndexCache,IndexStatus}.ts`、测试
  - 输入：IndexSnapshot、JsonSnapshotStore 思路
  - 输出：版本化缓存与 idle/indexing/degraded/error 状态
  - 不做：不把缓存当事实源、不保存完整正文
  - 单元测试：删除、损坏、版本升级、保存失败
  - 集成验收：重建规范结果等价，错误可见
  - 完成证据：cache recovery tests
  - 完成记录：已注册独立 runtime，提供 idle/indexing/degraded/error 状态；缓存版本校验、损坏忽略、正文脱敏、失败可见且不使已建索引失效

- [x] P0-019A 实现增量事件协调器
  - 依赖：P0-017、P0-018
  - 修改文件：`src/services/FileEventManager.ts`
  - 新增文件：`src/console/indexing/IndexCoordinator.ts`、测试
  - 输入：create/modify/delete/rename 与当前 snapshot
  - 输出：单 source contribution 更新和下一 snapshot
  - 不做：不把 rename 降级为无关联 delete/create
  - 单元测试：事件合并、顺序、取消、rename path
  - 集成验收：单文件事件不调用 fullScan
  - 完成证据：coordinator tests
  - 完成记录：已接入 Markdown create/modify/delete/rename，按 source contribution 发布下一快照；普通事件不调用 full scan

- [x] P0-019B 实现受影响入链诊断增量重算
  - 依赖：P0-019A
  - 修改文件：`src/console/indexing/IndexCoordinator.ts`
  - 新增文件：增量诊断集成测试
  - 输入：旧/新 links 与 RelationIndex
  - 输出：源文件及引用者诊断同步更新
  - 不做：不全量重跑全部健康规则
  - 单元测试：modify/delete/rename 的入链集合
  - 集成验收：普通编辑扫描计数为 1 + 受影响引用者
  - 完成证据：incremental-index tests
  - 完成记录：已计算旧/新 source record 与其前后入链引用者的确定集合；P0-059 健康规则执行器将直接消费该集合

## Wave 2：安全写入与 Console 壳层

- [x] P0-020 定义 Command、ChangePlan 与 ImpactReport 运行时契约
  - 依赖：P0-010、P0-017
  - 修改文件：`src/console/domain/changes.ts`
  - 新增文件：`src/console/application/commands.ts`、契约测试
  - 输入：spec 第 13 节、需求 21.2
  - 输出：命令注册、风险分类、完整影响类别
  - 不做：不执行写入
  - 单元测试：高风险矩阵、空类别序列化、确定 planId
  - 集成验收：需求预览内容全部可表示
  - 完成证据：command contract tests
  - 完成记录：已实现命令注册表、fail-closed 风险分类、确定性 planId 和完整空 ImpactReport；高风险处理器无法移除确认要求，契约测试通过

- [x] P0-021 实现 Markdown 变更规划器
  - 依赖：P0-020
  - 修改文件：无
  - 新增文件：`src/console/persistence/MarkdownChangePlanner.ts`、测试
  - 输入：command、snapshot、当前文件内容
  - 输出：确定性 FileChange/FieldDiff/RelationDiff
  - 不做：规划阶段不调用 create/modify/delete/rename
  - 单元测试：create/modify/move/delete、YAML diff、同输入等价
  - 集成验收：Vault write spy=0
  - 完成证据：planner tests
  - 完成记录：已实现 create/modify/move/delete 的只读规划、路径校验、mtime/hash、frontmatter 字段差异及稳定排序；规划端口无任何写方法

- [x] P0-022A 实现乐观并发校验与串行执行
  - 依赖：P0-021、P0-019
  - 修改文件：`src/core/ServiceRegistry.ts`、`src/core/PluginBootstrapper.ts`
  - 新增文件：`src/console/persistence/TransactionExecutor.ts`、测试
  - 输入：已确认 plan、path/mtime/hash、confirmation token
  - 输出：稳定顺序写入、冲突中止、索引刷新
  - 不做：不绕过确认、不覆盖外部修改
  - 单元测试：token、mtime/hash、排序、重复执行
  - 集成验收：冲突时 0 写入
  - 完成证据：transaction tests
  - 完成记录：已实现 planId 绑定的一次性 token、串行队列、全量预检、稳定路径写入与索引刷新等待；并发冲突测试确认零写入

- [x] P0-022B 实现失败补偿与人工恢复报告
  - 依赖：P0-022A
  - 修改文件：`src/console/persistence/TransactionExecutor.ts`
  - 新增文件：补偿注入测试
  - 输入：中途失败与内存原文快照
  - 输出：逆序补偿或 manual recovery report
  - 不做：不在日志持久化正文全文
  - 单元测试：第 N 文件失败、补偿期间外部修改、创建回删
  - 集成验收：无半完成关系
  - 完成证据：failure-injection tests
  - 完成记录：已覆盖 create/modify/delete/move 逆序补偿；补偿期间发现外部修改会停止覆盖并返回含运行期原文的人工恢复项，正文不进入审计

- [x] P0-023 实现轻量审计与撤销边界
  - 依赖：P0-022
  - 修改文件：无
  - 新增文件：`src/console/persistence/AuditRepository.ts`、测试
  - 输入：计划、执行结果、补偿结果
  - 输出：`console.audit.v1` 记录与可查询历史
  - 不做：不记录正文全文、不承诺跨事实自动撤销
  - 单元测试：成功/失败/补偿/脱敏
  - 集成验收：每次写入可追到作者操作
  - 完成证据：audit tests
  - 完成记录：已实现插件数据目录 console.audit.v1 追加/查询仓储，保存字段级 diff、结果和快照版本，并递归剔除正文类字段

- [x] P0-024 注册 NovelConsoleView 与打开命令
  - 依赖：P0-011
  - 修改文件：`src/core/ViewManager.ts`、`src/core/CommandManager.ts`、`src/constants.ts`
  - 新增文件：`src/console/ui/NovelConsoleView.ts`、测试
  - 输入：现有 ItemView 生命周期与桌面判定
  - 输出：普通 tab 打开/关闭/恢复的空壳
  - 不做：不替换旧 view，不改 manifest desktop-only
  - 单元测试：注册、state restore、onClose cleanup、非桌面
  - 集成验收：AC-01 且旧 views 不受影响
  - 完成证据：view tests/手工记录
  - 完成记录：已新增桌面端 webnovel-novel-console ItemView 与打开命令，支持 tab、状态恢复、关闭清理；移动端不注册，旧 view/command 回归通过；真实 Obsidian 分屏证据待手工补录

- [x] P0-025 实现导航、路由、搜索与详情容器
  - 依赖：P0-017、P0-024
  - 修改文件：`src/console/ui/NovelConsoleView.ts`
  - 新增文件：`src/console/ui/{router,navigation,components}.ts`、测试
  - 输入：plan 路由、EntityQuery、Workspace Leaf API
  - 输出：P0 可达导航、共享筛选、详情抽屉、相邻打开 Markdown
  - 不做：不在 UI 解析 Markdown、不建第二数据模型
  - 单元测试：路由恢复、搜索状态、选中对象、open source
  - 集成验收：AC-04/06 基础入口可达
  - 完成证据：routing tests
  - 完成记录：已实现全部 P0 路由、共享索引搜索、结果/详情容器和相邻 Leaf 原文打开；UI 只依赖 ConsoleApplication，不解析 Markdown

- [x] P0-026 实现 Leaf 容器宽度状态
  - 依赖：P0-024
  - 修改文件：`src/console/ui/NovelConsoleView.ts`
  - 新增文件：`src/console/ui/layout.ts`、测试
  - 输入：ResizeObserver 与 760/1180 断点
  - 输出：wide/medium/narrow data-layout 与清理
  - 不做：不依赖 window media width
  - 单元测试：边界值、连续 resize、disconnect
  - 集成验收：无需刷新，窄 Leaf 操作可达
  - 完成证据：layout tests/screenshots
  - 完成记录：已按容器宽度实现 <760 narrow、760–1179 medium、>=1180 wide，连续 resize 即时更新并在 onClose disconnect；手工截图待补录

- [x] P0-027 实现蓝雾晨光 token 与作用域审计
  - 依赖：P0-024
  - 修改文件：`src/styles/index.css`、`package.json`
  - 新增文件：`src/console/ui/console.css`、`scripts/console-css-audit.ts`、测试
  - 输入：spec 样式边界
  - 输出：根/Modal token、无未限界普通选择器
  - 不做：不向 body/workspace/button/input 注入全局规则
  - 单元测试：selector AST audit
  - 集成验收：主题/编辑器/其他插件截图无污染
  - 完成证据：audit 输出与 AC-02 截图
  - 完成记录：已新增蓝雾晨光主题派生 token、Console/Modal 根作用域 CSS 和 selector AST 审计；主 CSS 架构审计、Stylelint 均通过，主题截图待手工补录

- [x] P0-028 实现统一变更预览 Modal/抽屉
  - 依赖：P0-020、P0-025
  - 修改文件：无
  - 新增文件：`src/console/ui/ChangePreviewModal.ts`、测试
  - 输入：ChangePlan/ImpactReport/confirmation token
  - 输出：文件、字段、关系、影响、风险、确认/取消 UI
  - 不做：不提供高风险快速执行旁路
  - 单元测试：键盘、Esc、风险文案、token 单次使用
  - 集成验收：AC-16/31
  - 完成证据：UI tests
  - 完成记录：已展示文件/字段/关系/完整影响类别/风险/警告；token 只在显式确认时签发且按钮单次提交，Esc/取消不执行

## Wave 3：核心创作路径

- [x] P0-030 实现五级稀疏叙事树
  - 依赖：P0-017、P0-025
  - 修改文件：无
  - 新增文件：`src/console/application/NarrativeTreeQuery.ts`、页面与测试
  - 输入：层级关系与 story code
  - 输出：跳过缺省层级的导航树
  - 不做：不按目录深度伪造层级
  - 单元测试：全部缺省组合、孤立/环诊断
  - 集成验收：minimal 可到 CH-0001
  - 完成证据：AC-05 tests
  - 完成记录：已实现基于显式实体关系的稀疏叙事树，允许跳过任意中间层级，不从目录深度推断层级；孤立节点保持可达并输出缺父/环诊断，章节 story code 与 minimal 路径测试通过

- [x] P0-031 实现正文管理投影
  - 依赖：P0-017、P0-025
  - 修改文件：无
  - 新增文件：正文 Query/Page/tests
  - 输入：CH/REV-CH、状态、层级关系
  - 输出：正文版本/发布状态浏览筛选
  - 不做：不把策划摘要混入正文主体
  - 单元测试：旧章、修订、状态筛选
  - 集成验收：叙事与正文页面语义分离
  - 完成证据：AC-04 tests
  - 完成记录：已实现 CH/REV-CH 正文投影、发布状态与标题/摘要筛选、修订关联和稳定章节排序；搜索不读取正文 body，叙事与正文保持独立页面语义

- [x] P0-032 接入沉浸写作与相邻编辑器
  - 依赖：P0-031
  - 修改文件：正文页面、`src/ui/ImmersiveModeManager.ts` 的公开入口（如需）
  - 新增文件：集成测试
  - 输入：选中 chapter source 与现有沉浸能力
  - 输出：两个明确入口及返回状态保持
  - 不做：不重做 Markdown 编辑器
  - 单元测试：open/return、missing source
  - 集成验收：旧沉浸回归通过
  - 完成证据：UI smoke
  - 完成记录：正文与章节详情提供相邻编辑器、沉浸写作两个明确入口；沉浸入口先激活目标 Markdown Leaf，再通过 ensureImmersiveMode 保持已开启状态，Console router state 不被重建；缺失 source 返回 false

- [x] P0-033 实现项目状态/焦点 Markdown repository
  - 依赖：P0-022、P0-015
  - 修改文件：无
  - 新增文件：`src/console/persistence/ProjectStateRepository.ts`、测试
  - 输入：spec 当前阶段 schema 与 mapped control path
  - 输出：read、create/update plan、唯一焦点校验
  - 不做：不存在时不静默创建
  - 单元测试：缺文件、坏 ID、多线 cursor、并发
  - 集成验收：作者预览后才创建
  - 完成证据：project-state tests
  - 完成记录：已在 mapped control path 实现固定当前阶段文件的 read/create/update plan，校验唯一 current_focus 与多线 EVT cursor；缺文件返回 null 且 update 不静默创建，实际写入仍受 mtime/hash 并发校验和确认令牌保护

- [x] P0-034 实现 ChapterWorkspaceQuery
  - 依赖：P0-017、P0-030、P0-031、P0-033
  - 修改文件：无
  - 新增文件：`src/console/application/ChapterWorkspaceQuery.ts`、测试
  - 输入：共享 snapshot 与 chapter ID
  - 输出：需求 10.4 的联合读模型
  - 不做：不直接调用旧 Manager、不因缺关系失败
  - 单元测试：十类聚合、空态、legacy chapter
  - 集成验收：每类有数据或明确缺失
  - 完成证据：query tests
  - 完成记录：已用同一 IndexSnapshot 联合章节、策划、修订、事件、人物、组织、地点、道具、伏笔和任务；支持双向关系与 legacy key，缺索引/缺章节返回明确诊断

- [x] P0-035 实现章节联合页面与详情写入白名单
  - 依赖：P0-028、P0-034
  - 修改文件：无
  - 新增文件：章节页面/详情组件/测试
  - 输入：ChapterWorkspace、command bus、spec 白名单
  - 输出：联合展示、安全标量/ID 列表编辑、原文入口
  - 不做：不在 Console 编辑长正文
  - 单元测试：白/黑名单、高风险强制预览
  - 集成验收：长正文只在原生编辑器
  - 完成证据：UI tests
  - 完成记录：章节详情已展示联合聚合计数、原文与沉浸入口，并通过统一预览 Modal 修改白名单字段；body/未知字段 fail closed，YAML 列表替换不残留旧缩进行且正文原样保留

- [x] P0-036 实现 ContextPlanner 与边界策略
  - 依赖：P0-017、P0-033
  - 修改文件：无
  - 新增文件：`src/console/application/ContextPlanner.ts`、测试
  - 输入：目标、snapshot、manual overrides、policy
  - 输出：有限扩展 ContextPlan
  - 不做：不无限递归、不改变 reader/POV
  - 单元测试：默认排除、直接关系、前置深度、manual precedence
  - 集成验收：AC-24/26
  - 完成证据：context policy tests
  - 完成记录：已实现 0..5 有界关系扩展与事件前置深度、默认 canon+active+current 治理、manual include/exclude 优先级、归档阻断、知识边界透传和确定性 planId

- [x] P0-037 实现上下文预览选择 UI
  - 依赖：P0-025、P0-036
  - 修改文件：无
  - 新增文件：ContextPage/Item/测试
  - 输入：ContextPlan
  - 输出：需求 19.4 全字段与手动纳入/排除
  - 不做：不隐藏知识风险
  - 单元测试：状态切换、冲突、未揭示标记、键盘
  - 集成验收：AC-25
  - 完成证据：UI tests
  - 完成记录：上下文页可选目标并逐项展示原因、关系、权威、生命周期、范围、复核、知识边界、摘要、冲突和未揭示标记；手动纳入/排除使用原生 button 并重新规划

- [x] P0-038 实现 MD+JSON Schema 与原子输出
  - 依赖：P0-022、P0-036、P0-037
  - 修改文件：`src/console/domain/knowledge.ts`
  - 新增文件：context JSON Schema、renderer/repository/tests
  - 输入：ContextPlan 与 mapped context path
  - 输出：同 planId 的 MD/JSON 原子替换
  - 不做：不直接调用 Codex、不发布半套输出
  - 单元测试：schema、golden、任一写入失败、上一版保留
  - 集成验收：AGENTS.md/Skill 稳定读取
  - 完成证据：AC-27 tests
  - 完成记录：已按冻结 console.context.v1 Schema 输出同 planId 的 current-context.md/json；双文件进入同一 ChangePlan 和串行事务，第二次写入失败测试确认逆序补偿并完整保留上一版

- [x] P0-039 实现总控骨架与 DashboardQuery
  - 依赖：P0-033、P0-034、P0-036
  - 修改文件：无
  - 新增文件：DashboardQuery/Page/tests
  - 输入：焦点、章节、上下文、健康占位与旧统计 ports
  - 输出：行动导向总览基础
  - 不做：不在本项实现任务激活/健康规则
  - 单元测试：有/无焦点、空状态、顺序
  - 集成验收：阶段 2 演示数据可用
  - 完成证据：dashboard tests
  - 完成记录：总览已聚合配置状态、当前焦点、章节工作区、故事线游标、索引/健康计数，并按现在/遗漏/即将/稍后固定顺序提供 Wave 4/5 行动占位；有/无焦点空态测试通过

## Wave 4：事件、里程碑与推进

- [x] P0-040 实现事件真相模型与仓储
  - 依赖：P0-012、P0-022
  - 修改文件：`src/console/domain/events.ts`
  - 新增文件：`src/console/persistence/EventRepository.ts`、测试
  - 输入：EVT EntityRecord、Properties adapter、transaction
  - 输出：事件核心字段、区间、多对多章节的 read/plan-create/plan-update
  - 不做：不写章节侧派生字段、不复制事件
  - 单元测试：持续事件、空结束、跨 calendar、读写 round-trip
  - 集成验收：EVT 属性可安全读写
  - 完成证据：event repository tests
  - 完成记录：已实现 EVT 核心字段规范化读取、持续事件/空结束、跨历法原值保留，以及 plan-create/plan-update；更新只写 EVT 权威文件并保留正文，章节映射仅作为事件侧 ID 列表

- [x] P0-041 实现多时间轴投影与事件页面
  - 依赖：P0-040、P0-025
  - 修改文件：无
  - 新增文件：TimelineProjectionQuery/EventControlPage/测试
  - 输入：同一 EVT 的 timelineViews 与筛选
  - 输出：现实/隐藏/宇宙/人物/组织/归档只读投影
  - 不做：不创建事件副本，不移除旧时间线页面
  - 单元测试：多视图、归档、不可比时间分组
  - 集成验收：AC-10
  - 完成证据：timeline projection tests
  - 完成记录：已由单一 IndexSnapshot 将同一 EVT 投影到现实、隐藏、宇宙、人物、组织和归档视图；跨历法分组并明确提示不可比较，事件页不创建副本

- [x] P0-042 实现视图独立重要度命令
  - 依赖：P0-041、P0-028
  - 修改文件：无
  - 新增文件：UpdateTimelineImportanceCommand/测试
  - 输入：event ID、目标 view key、importance
  - 输出：只触及目标 view 的 ChangePlan
  - 不做：不重写其他 view map
  - 单元测试：reality/hidden/character/organization diff 隔离
  - 集成验收：AC-11
  - 完成证据：field diff tests
  - 完成记录：已实现 reality/hidden/cosmic/character/organization 目标视图更新，ChangePlan 仅包含目标 `timeline_views.<view>.importance` 字段 diff，其他视图值保持不变

- [x] P0-043 实现三状态展示与独立命令
  - 依赖：P0-040、P0-028
  - 修改文件：无
  - 新增文件：event state commands/components/tests
  - 输入：spec 三个状态机
  - 输出：独立状态展示与独立 ChangePlan
  - 不做：不隐式联动其他两状态
  - 单元测试：所有允许/拒绝转换、字段 diff 隔离
  - 集成验收：AC-12
  - 完成证据：event-state tests
  - 完成记录：事件投影同时独立展示事实、叙事、读者状态；三个命令分别校验冻结状态机并只产生单字段 diff，`reader_state: unknown` 按合法知识状态处理

- [x] P0-044 实现事件依赖图、环检测与最短距离
  - 依赖：P0-040、P0-017
  - 修改文件：无
  - 新增文件：`src/console/application/EventGraph.ts`、测试
  - 输入：storyline、prerequisiteEventIds、snapshot
  - 输出：图查询、BFS 距离、环/缺边/跨线/不可达解释
  - 不做：不猜测跨 calendar/跨线顺序
  - 单元测试：DAG、环、自环、diamond、跨线、缺边
  - 集成验收：结果确定且可解释
  - 完成证据：graph tests
  - 完成记录：已实现前置到后继的确定性图与 BFS 最短距离；DAG/diamond 返回数值，环、自环、缺边、跨线、不可达和缺事件返回带 reason 的 indeterminate

- [x] P0-045 实现里程碑条件求值
  - 依赖：P0-040、P0-044
  - 修改文件：`src/console/domain/milestones.ts`
  - 新增文件：MilestoneEvaluator/测试
  - 输入：all/any/sequence/manual 与 event states/order
  - 输出：not_ready/ready/indeterminate/manual_review
  - 不做：不写 completed
  - 单元测试：四模式、缺事件、不可比、顺序错误
  - 集成验收：AC-13 计算部分
  - 完成证据：table-driven tests
  - 完成记录：已实现 all/any/sequence/manual 表驱动求值；缺事件或 sequence 无可比顺序返回 indeterminate，只产生 completion_ready 等读结果，不写 completed

- [x] P0-046 实现多剧情线游标与系统建议
  - 依赖：P0-033、P0-044
  - 修改文件：无
  - 新增文件：CursorQuery/CursorSuggestionService/commands/tests
  - 输入：project state、打开对象、事件图
  - 输出：切线恢复、建议与更新 ChangePlan
  - 不做：建议不写权威游标
  - 单元测试：多线切换、唯一焦点、无路径建议
  - 集成验收：AC-14/15
  - 完成证据：cursor tests
  - 完成记录：已读取并恢复多剧情线游标，打开同线事件时以事件图派生稳定建议；无路径保留解释且零写入，正式游标更新生成高风险 ChangePlan

- [x] P0-047 实现推进影响分析
  - 依赖：P0-020、P0-043、P0-045、P0-046
  - 修改文件：无
  - 新增文件：`src/console/application/ProgressionImpactAnalyzer.ts`、测试
  - 输入：候选推进 plan、snapshot
  - 输出：spec 全类别 ImpactReport
  - 不做：不执行写入、不裁决 unknown risks
  - 单元测试：任务/伏笔/人物/物品/知识/章节/上下文/行动
  - 集成验收：AC-16
  - 完成证据：impact tests
  - 完成记录：已基于候选计划和同一 IndexSnapshot 生成固定全类别 ImpactReport，覆盖入/出链、事件、任务、伏笔、人物、物品、知识、章节、上下文、健康、行动与 unknown risks，空类别显式为空数组

- [x] P0-048 实现作者确认式推进
  - 依赖：P0-022、P0-028、P0-047
  - 修改文件：无
  - 新增文件：event/cursor/milestone progression commands/tests
  - 输入：ChangePlan、ImpactReport、confirmation token
  - 输出：三类确认推进与限定撤销
  - 不做：撤销游标不回滚其他已确认事实
  - 单元测试：确认前零写、token、并发、撤销边界
  - 集成验收：阶段 4 完整演示
  - 完成证据：progression integration tests
  - 完成记录：事件状态、剧情线游标、里程碑状态均通过 ChangePlan + ImpactReport + plan-bound 一次性 token + 并发校验执行；确认前零写入，游标限定撤销明确不回滚其他已确认事实

## Wave 5：任务、伏笔、人物、物品与健康

- [x] P0-050 实现 TSK 模型与仓储
  - 依赖：P0-012、P0-022、P0-044
  - 修改文件：`src/console/domain/tasks.ts`
  - 新增文件：CreativeTaskRepository/commands/tests
  - 输入：TSK schema 与六种 activation
  - 输出：新任务 CRUD ChangePlan
  - 不做：不改写旧限时任务
  - 单元测试：六 relation、related/activation 分离、状态转换
  - 集成验收：AC-18
  - 完成证据：task tests
  - 完成记录：已实现新格式 TSK 解析、创建/更新/删除/状态 ChangePlan、六种 activation 与拒绝路径；删除为高风险确认操作，旧限时任务保持只读

- [x] P0-051 实现行动分组算法
  - 依赖：P0-045、P0-046、P0-050
  - 修改文件：无
  - 新增文件：ActionProjectionService/测试
  - 输入：task/suggestion/anchor/cursor/graph distance
  - 输出：now/upcoming/missed/later/needs_confirmation
  - 不做：不因 occurred 单独激活历史/隐藏/宇宙/非当前线
  - 单元测试：优先级、距离边界、越过、无效/跨线/环
  - 集成验收：AC-19/20/21
  - 完成证据：action-group tests
  - 完成记录：已按游标、事件图距离、锚点关系和状态输出五类行动组；无效、跨线、环与需确认条件均 fail-closed

- [x] P0-052 聚合旧限时任务
  - 依赖：P0-014、P0-051
  - 修改文件：ActionProjectionService
  - 新增文件：legacy/new aggregate tests
  - 输入：LegacyTimedTaskAdapter ActionItem 与新 TSK
  - 输出：统一只读总览列表并保留来源类型
  - 不做：不分配 TSK ID、不改变日期逻辑
  - 单元测试：同名、过期、字数、排序
  - 集成验收：旧任务继续按日期工作
  - 完成证据：aggregate tests
  - 完成记录：已将 LegacyTimedTaskAdapter 结果并入统一 ActionItem，保留 legacy-timed-task 来源与既有日期语义

- [x] P0-053 实现系统建议决策持久化
  - 依赖：P0-022、P0-051
  - 修改文件：无
  - 新增文件：SuggestionService/DecisionRepository/commands/tests
  - 输入：稳定 suggestion ID 与五种决策
  - 输出：建议决策日志；确认转 TSK
  - 不做：除 converted_to_task 外不创建任务
  - 单元测试：幂等身份、latest decision、延后、忽略、不适用
  - 集成验收：AC-22
  - 完成证据：suggestion tests
  - 完成记录：已实现确定性建议 ID、latest decision、五种决策日志；仅 converted_to_task 合并任务创建与决策写入并要求确认

- [x] P0-054 实现新伏笔事件锚点 adapter 与命令
  - 依赖：P0-014、P0-022、P0-046
  - 修改文件：无
  - 新增文件：ForeshadowingPropertiesAdapter/commands/tests
  - 输入：FSH truth/plant/advance/reveal anchors 与旧 adapter
  - 输出：新稳定锚点读写；旧数据补全计划
  - 不做：旧伏笔不自动升级
  - 单元测试：多锚点、坏锚点、旧格式并存
  - 集成验收：补全必有预览
  - 完成证据：foreshadowing adapter tests
  - 完成记录：已实现 truth/plant/advance/reveal 稳定锚点解析与受控字段更新；旧格式写入明确拒绝且不会自动升级

- [x] P0-055 实现伏笔接近与错过规则
  - 依赖：P0-051、P0-054
  - 修改文件：无
  - 新增文件：ForeshadowingActionRules/测试
  - 输入：cursor、图距离、FSH 状态/锚点
  - 输出：推进提醒与 missed action/diagnostic
  - 不做：不自动标记埋设/推进/揭示
  - 单元测试：三类锚点、接近、越过、跨线、unknown
  - 集成验收：AC-23
  - 完成证据：FSH rule tests
  - 完成记录：已按游标和图距离生成接近/错过诊断，跨线、不可达和 unknown 不被误判为自动状态变化

- [x] P0-056 完成行动导向总览
  - 依赖：P0-039、P0-052、P0-053、P0-055
  - 修改文件：DashboardPage/Query
  - 新增文件：dashboard integration tests
  - 输入：焦点、action groups、关键事件、上下文、健康摘要
  - 输出：需求顺序总览；now/missed 默认展开
  - 不做：不做 AI 排期/自动完成
  - 单元测试：分组展开、操作、来源/原因/锚点/影响
  - 集成验收：每个行动项信息完整
  - 完成证据：dashboard tests/screenshots
  - 完成记录：Dashboard 已汇总焦点、五类行动、关键事件、上下文与健康摘要，并展示来源、原因和锚点；now/missed 默认展开

- [x] P0-057 实现人物中心基础版
  - 依赖：P0-017、P0-035、P0-041
  - 修改文件：无
  - 新增文件：CharacterCenterQuery/Page/只读经历线/tests
  - 输入：CHR、事件/章节关系与详情白名单
  - 输出：核心字段、参与事件/章节、冲突提示、原文入口
  - 不做：不做完整交互经历线
  - 单元测试：列表筛选、经历排序、缺关系、白名单
  - 集成验收：AC-08 人物部分
  - 完成证据：character tests
  - 完成记录：已提供人物详情查询与 Console 详情入口，投影参与事件/章节、按叙事时间排序并显示位置冲突和原文来源

- [x] P0-058 实现道具中心基础版
  - 依赖：P0-017、P0-035、P0-041
  - 修改文件：无
  - 新增文件：ItemCenterQuery/Page/flow projection/tests
  - 输入：ITM 与事件驱动获得/转移/损坏/遗失/销毁
  - 输出：当前/历史持有、位置、事件、章节与关系
  - 不做：不做完整流转编辑器/复杂时态推理
  - 单元测试：合法转移、多持有、状态未更新
  - 集成验收：AC-08 道具部分
  - 完成证据：item tests
  - 完成记录：已提供道具详情查询与 Console 详情入口，投影持有历史、当前持有者、事件/章节并报告多持有冲突

- [x] P0-059 实现健康规则框架与结构规则
  - 依赖：P0-017、P0-019
  - 修改文件：`src/console/domain/diagnostics.ts`
  - 新增文件：HealthRuleRegistry/结构 rules/tests
  - 输入：spec 稳定结构 Rule ID 与 snapshot delta
  - 输出：结构诊断、证据、建议、安全 autoFixKind
  - 不做：不自动改 ID/链接/权威状态
  - 单元测试：每一结构 Rule ID 对应 fixture
  - 集成验收：增量重算只影响相关实体
  - 完成证据：health/structure tests
  - 完成记录：已冻结 34 个稳定 Rule ID，建立统一注册表、证据与严重度输出；事实类问题不提供自动裁决

- [x] P0-060 实现事件与连续性规则
  - 依赖：P0-044、P0-057、P0-058、P0-059
  - 修改文件：无
  - 新增文件：event/continuity rules/tests
  - 输入：事件图、时间、人物/物品投影
  - 输出：spec 事件/连续性 Rule ID 结果
  - 不做：不自动裁决位置、持有、知识事实
  - 单元测试：每一对应 Rule ID 与证据定位
  - 集成验收：需求 20.2 全覆盖
  - 完成证据：health/continuity tests
  - 完成记录：已覆盖事件依赖/时间/跨线/章节映射及人物位置、状态、物品持有和所有权连续性诊断

- [x] P0-061 实现任务、伏笔与推进规则
  - 依赖：P0-051、P0-055、P0-059
  - 修改文件：无
  - 新增文件：progression rules/tests
  - 输入：action groups、suggestion decisions、FSH/TSK
  - 输出：spec 推进 Rule ID 结果
  - 不做：不自动完成任务/伏笔
  - 单元测试：六类规则、长期忽略、错误激活
  - 集成验收：需求 20.3 全覆盖
  - 完成证据：health/progression tests
  - 完成记录：已覆盖任务锚点无效/越过、伏笔接近/错过、隐藏历史误激活及长期忽略建议仍相关等推进诊断

- [x] P0-062 实现资料健康页与总览摘要
  - 依赖：P0-056、P0-059、P0-060、P0-061
  - 修改文件：DashboardQuery/Page
  - 新增文件：HealthPage/测试
  - 输入：HealthRuleRegistry results
  - 输出：四级筛选、证据定位、受控安全修复
  - 不做：不把建议显示成已修复
  - 单元测试：筛选、定位、auto-fix whitelist、键盘
  - 集成验收：AC-28
  - 完成证据：health page tests
  - 完成记录：已实现四级筛选、Rule ID/证据定位、安全修复白名单展示，并接入 Console 健康路由与 Dashboard 摘要

## Wave 6：兼容、性能与发布验收

- [x] P0-070 加固拆分、合并与排序稳定锚点
  - 依赖：P0-015、P0-047、P0-054
  - 修改文件：`src/services/ChapterSplitter.ts`、`ChapterMergeManager.ts`、`ChapterSorter.ts`
  - 新增文件：`tests/console/stable-anchors.test.ts`
  - 输入：现有章节操作与 EVT/TSK/FSH ID anchors
  - 输出：新章新 ID、映射影响建议、锚点保持
  - 不做：不自动移动源事件锚点
  - 单元测试：拆/合/插/排、模板复制 ID 防护
  - 集成验收：AC-17
  - 完成证据：stable-anchor tests
  - 完成记录：拆分新章会分配会话内保留且与索引/MetadataCache 查重的 `CH-*`，模板永久 ID 与具体关系锚点不复制；源章 EVT/TSK/FSH 锚点保持并输出影响建议；合并整批预检并发锚点变更；排序不改 Markdown。专项 6 项测试通过

- [x] P0-071 完成旧能力回归矩阵
  - 依赖：P0-056、P0-062、P0-070
  - 修改文件：验收矩阵状态
  - 新增文件：`doc/console-v0.21/evidence/AC-30.md`
  - 输入：P0-001 基线与需求 22.1
  - 输出：主页/工作台/章节/时间线/伏笔/设定/任务/沉浸/统计/校对/合并/创建证据
  - 不做：不以新入口存在代替旧能力可用
  - 单元测试：完整现有 test suite
  - 集成验收：逐项 smoke
  - 完成证据：AC-30 记录
  - 完成记录：2026-09-11 P0-001 非 Console 基线 55 文件、958/958 通过，type-check 通过；两轮真实 Obsidian smoke 覆盖主页、工作台、章节、时间线、伏笔、设定、任务、沉浸、统计、校对、合并和创建。发现的命令可见性与设定架构兼容缺陷修复后由用户确认全部通过，AC-30 闭环。证据：`doc/console-v0.21/evidence/AC-30.md`、`doc/console-v0.21/evidence/closure/P0-093-legacy-regression.md`。

- [~] P0-072 完成 CSS、主题、窄 Leaf 与无障碍验收
  - 依赖：P0-026、P0-027、P0-062
  - 修改文件：按缺陷修复 Console UI/CSS
  - 新增文件：`doc/console-v0.21/evidence/AC-02/`、`AC-03/`
  - 输入：100/125/150% 缩放、常用主题、宽中窄 Leaf
  - 输出：截图与键盘/减少动画记录
  - 不做：不验收移动端
  - 单元测试：CSS audit/UI accessibility tests
  - 集成验收：核心状态非仅颜色、操作不消失
  - 完成证据：AC-02/03 证据
  - 完成记录：2026-09-11 CSS 作用域、宽中窄布局、键盘原生控件、文本状态与减少动画自动检查通过，用户完成宽中窄 Leaf 实测；用户明确批准跳过四张边界截图、默认明/暗与第三方主题的 100/125/150% 九格矩阵，以及全键盘/减少动画实机步骤。按批准范围变更关闭，未执行项继续在 P0-092 证据与最终报告中披露

- [x] P0-073 完成大型 Vault 性能验收
  - 依赖：P0-018、P0-019、P0-062
  - 修改文件：按数据优化索引实现
  - 新增文件：benchmark runner、`doc/console-v0.21/evidence/AC-32.md`
  - 输入：确定性 10k fixture 与 spec 阈值
  - 输出：初建、增量、搜索、内存、UI 响应 P50/P95
  - 不做：不静默放宽阈值
  - 单元测试：扫描计数与 50-batch yield
  - 集成验收：AC-32；不满足则提交范围变更
  - 完成证据：设备信息与 benchmark 报告
  - 完成记录：确定性 fixture 已在系统临时目录物化为 10k Markdown 后执行基准并清理；初建（含文件读取）847.18ms、增量 P95 47.53ms、搜索 P95 2.28ms，每 50 文件让出一次事件循环（200 次），见 AC-32 证据

- [x] P0-074 完成故障与数据完整性演练
  - 依赖：P0-022、P0-038、P0-062
  - 修改文件：按演练缺陷修复
  - 新增文件：故障演练报告
  - 输入：缓存损坏、并发修改、写入失败、补偿冲突、双输出失败
  - 输出：无丢失/半完成证明与人工恢复步骤
  - 不做：不依赖永久正文备份日志
  - 单元测试：failure injection suite
  - 集成验收：上一上下文可恢复、Markdown 事实完好
  - 完成证据：`doc/console-v0.21/evidence/AC-29-31.md`
  - 完成记录：缓存损坏、并发修改、写入失败逆序补偿、补偿冲突人工恢复、索引发布失败与 MD+JSON 第二写失败均由 failure-injection tests 验证，事实文件与上一版上下文保持可恢复

- [x] P0-075 执行 32 条 P0 最终验收
  - 依赖：P0-071、P0-072、P0-073、P0-074
  - 修改文件：`doc/console-v0.21/acceptance-matrix.md`
  - 新增文件：签字版验收报告
  - 输入：所有自动/手工证据与批准的范围变更
  - 输出：32/32 结论、条件项/建议项分离、发布决定
  - 不做：不把未验证标记通过，不以建议项阻塞发布
  - 单元测试：完整 type-check/lint/test/coverage
  - 集成验收：所有发布闸门
  - 完成证据：签字版报告
  - 完成记录：2026-09-12 已完成 AC-01～32 最终验收与签字：30 条通过，AC-02、AC-03 经用户批准变更，0 条进行中、0 条阻塞。用户明确批准发布 v0.3；清单版本 0.3.0，从固定提交 `137b4c8fb231b09f6f6440ac48584fb01f57193f` 可复现构建，三件套校验一致。签字报告：`doc/console-v0.21/evidence/closure/V0.21-final-acceptance.md`。
