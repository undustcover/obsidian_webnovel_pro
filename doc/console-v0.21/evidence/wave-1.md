# Wave 1 验收证据

- 日期：2026-09-09（Asia/Shanghai）
- 范围：P0-011～P0-019
- 事实源写入：首次索引和增量索引均不调用 Vault Markdown 写 API；唯一持久化是插件目录内的派生索引缓存。

## 自动门禁

| 门禁 | 命令 | 结果 |
|---|---|---|
| TypeScript | `.\\node_modules\\.bin\\tsc.cmd --noEmit` | 退出码 0 |
| CSS build/stylelint/audit | `esbuild ...`、`stylelint ... --max-warnings 0`、`tsx scripts/css-audit.ts` | 退出码 0；82 modules / 1428 rules |
| ESLint | `eslint --max-warnings=0 src/ main.ts` | 退出码 0 |
| Obsidian API audit | `tsx scripts/obsidian-audit.ts` | 退出码 0；仅保留扫描需求提示 |
| i18n audit | `tsx scripts/i18n-audit.ts` | 退出码 0；1100 keys synchronized |
| Full test | `vitest run` | 退出码 0；60 files / 981 tests 通过 |
| Coverage | `vitest run --coverage` | 退出码 0；60 files / 981 tests 通过；总计 statements/lines 68.96%、branches 76.35%、functions 77.90%；`src/console/domain` 100% |

## Wave 1 契约证据

1. `tests/console/project-config.test.ts` 与 `tests/SettingsManager.test.ts`：默认配置、非法配置、多项目、旧设置升级和映射保留。
2. `tests/console/adapters.test.ts`：字段优先级/冲突、全部 P0 canonical type、旧章节/设定/时间线/伏笔/任务只读投影。
3. `tests/console/indexing.test.ts`：ID/StoryCode、scope、坏文件隔离、查询/关系、缓存损坏与正文脱敏、多项目缓存、缓存写失败降级、全量首扫和增量事件。
4. `tests/FileEventManager.test.ts`：create/modify/delete/rename 桥接到可选 Console runtime，旧字数统计资格规则不变。
5. `tests/PluginBootstrapper.test.ts`：Console runtime 独立注册；注册或初始化失败不阻断旧功能启动。

## 已知边界

- 大型 Vault 的最终性能阈值与手工 Obsidian 演示仍属于 P0-073/P0-072；本 Wave 已证明普通单文件事件不会再次调用 `getMarkdownFiles()`。
- P0-019B 只计算变更源及其入链引用者集合；完整健康规则执行器在 P0-059 接入该集合，不在本 Wave 提前实现。
- 索引缓存是派生数据且不保存正文 body；损坏、版本不兼容或读失败时忽略并从 Markdown 重建。

