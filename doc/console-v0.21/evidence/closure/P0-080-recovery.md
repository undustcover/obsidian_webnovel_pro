# P0-080C 索引 retry/rebuild

日期：2026-09-11

## 实现

- `retryIndex(projectId)` 通过 application 门面触发目标项目重新扫描，并刷新该项目派生索引缓存。
- `rebuildIndex(projectId)` 先删除目标项目的派生索引缓存，再重新扫描并写回规范缓存。
- 未知项目与同项目并发恢复显式拒绝；恢复锁在成功或失败后都会释放。
- 缓存删除失败时不开始扫描；扫描失败时保留最后一次已发布 snapshot，并由现有可用性契约报告 `INDEX_SCAN_FAILED`。
- 恢复仅操作 `console-index-v1-<projectId>.json` 派生缓存，不删除 audit、设置或任何 Markdown。

## 自动验证

- `recovery.test.ts` 5 项覆盖 retry 成功及规范结果等价、扫描失败、坏缓存 rebuild、缓存删除失败和未知项目。
- application、reconfigure、settings 协调与 recovery 共 4 个测试文件、24/24 通过。
- 命令：`node node_modules/vitest/vitest.mjs run tests/console/recovery.test.ts tests/console/reconfigure.test.ts tests/console/project-settings-model.test.ts tests/console/ConsoleApplication.test.ts`。
- 加入 `indexing.test.ts` 的 P0-080 父任务集成回归共 36/36 通过。
- `node node_modules/typescript/bin/tsc --noEmit`、完整 ESLint、Stylelint、CSS architecture/scope audit、i18n audit 与 Obsidian API audit 均通过；API audit 仅有既有建议，无错误。

## 集成边界

测试从 `ConsoleApplication.retryIndex/rebuildIndex` 进入真实 runtime、索引服务与内存缓存适配器。坏 JSON 缓存经 rebuild 后被替换为可解析且包含同一实体键的规范缓存；缓存删除失败与扫描失败均保留旧 snapshot。

## 回滚点

可独立回滚 application 恢复门面、runtime recovery 方法及对应测试；不涉及用户数据迁移或 Markdown 回滚。
