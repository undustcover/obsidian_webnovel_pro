# V0.21 P0 基线记录

- 任务：P0-001
- 日期：2026-09-09
- 工作目录：`obsidian-webnovel-assistant-main/`
- Node：`v24.19.0`
- 依赖恢复：使用临时 npm 11.6.2 执行 `npm ci`，按 `package-lock.json` 安装 580 个包
- 安全提示：npm audit 报告 8 个既有依赖漏洞（1 low、3 moderate、4 high）；Wave 0 不执行可能改变依赖图的 `npm audit fix`

## 基线结果

| 检查 | 等价命令 | 结果 | 证据摘要 |
|---|---|---|---|
| TypeScript | `npm run type-check` | 通过 | `tsc --noEmit`，退出码 0 |
| lint | `npm run lint` | 通过 | CSS 构建；Stylelint；CSS、ESLint、Obsidian API、i18n 审计均退出码 0 |
| test | `npm test` | 通过 | 55 个测试文件、951 项测试全部通过，耗时 4.58s |
| coverage | `npm run test:coverage` | 通过 | 55 个测试文件、951 项测试全部通过；阈值通过 |

覆盖率基线：

| Statements | Branches | Functions | Lines |
|---:|---:|---:|---:|
| 68.79% | 76.16% | 77.76% | 68.79% |

## 既有非失败输出

- Obsidian API 审计对 `src/ui/SettingsTab.ts:2081`、`src/utils/ui.ts:36` 的 `navigator.clipboard` 使用给出建议，审计仍通过。
- 测试故意注入磁盘读取、缓存写入、Workspace 调用和批量同步失败，因而 stderr 有预期错误日志；测试全部通过。
- 首次尝试使用 pnpm 恢复依赖时，pnpm 因未批准 `esbuild` 安装脚本退出；随后已用 `npm ci` 重建，最终基线只以 npm lockfile 安装结果为准。

## P0 新代码覆盖率门槛

现有全库阈值暂不回溯修改。新增的 `src/console/domain`、`src/console/application`、`src/console/persistence` 在对应 Wave 纳入覆盖率配置，目标为：lines/statements >= 85%，branches >= 80%，functions >= 90%。
