# P0-093B 完整工程验证

- 日期：2026-09-11
- 状态：通过
- 验证基线：`328e1ae884e2-dirty`
- Node：`v22.18.0`
- 版本：`0.21.9`
- `package-lock.json` SHA-256：`8838CCD279B8F9BE9E75A1D372BD8EFB1C1ECA28E2D3C5C55F4B54CBC4BABAC8`
- `pnpm-lock.yaml` SHA-256：`797E9410E4AFDF49B959A10A1DAF54E1559659E5C4B87E5C5EF0C43B5AB54810`

## 门禁结果

没有更新依赖，没有降低测试、lint、coverage 或性能阈值。因当前 npm 全局入口不可用，使用锁定 `node_modules` 中各工具的直接入口执行等价命令。

| 门禁 | 等价命令 | 结果 |
|---|---|---|
| TypeScript | `tsc --noEmit` | 通过，退出码 0 |
| CSS 构建 | `esbuild src/styles/index.css --bundle --outfile=styles.css` | 通过，256.7 KB |
| Stylelint | `stylelint "src/styles/**/*.css" "src/console/ui/console.css" --max-warnings 0` | 通过，0 warning |
| CSS 架构审计 | `tsx scripts/css-audit.ts` | 通过，83 modules、1509 rules |
| Console CSS 作用域 | `tsx scripts/console-css-audit.ts` | 通过 |
| ESLint | `eslint --max-warnings=0 src/ main.ts` | 通过，0 warning |
| Obsidian API 审计 | `tsx scripts/obsidian-audit.ts` | 通过；5 条非阻断 recommendation |
| i18n 审计 | `tsx scripts/i18n-audit.ts` | 通过；1135 keys 同步，11 个校对文件无 AST sink 问题 |
| Console 错误反馈审计 | `tsx scripts/console-error-feedback-audit.ts` | 通过 |
| 全量测试 | `vitest run` | 125/125 文件、1275/1275 测试通过 |
| Coverage | `vitest run --coverage` | 125/125 文件、1275/1275 测试通过；全部冻结阈值通过 |
| 10k benchmark | `tsx scripts/console-large-vault-benchmark.ts` | 通过，10000/10000 文件与记录 |

## Coverage

| 范围 | Statements | Branches | Functions | Lines | 冻结阈值结论 |
|---|---:|---:|---:|---:|---|
| 全部 | 72.32% | 77.67% | 82.70% | 72.32% | 通过全库阈值 |
| Console application | 99.43% | 82.05% | 93.85% | 99.43% | 通过 85/80/90/85 |
| Console domain | 98.51% | 85.71% | 90.90% | 98.51% | 通过 85/80/90/85 |
| Console persistence | 98.42% | 81.48% | 99.07% | 98.42% | 通过 85/80/90/85 |

## 10k 性能

设备：Windows `10.0.26200`、AMD Ryzen 7 7800X3D、16 logical CPUs、31.15 GB RAM。

| 指标 | 实测 | 冻结阈值 | 结果 |
|---|---:|---:|---|
| initial index | 348.59 ms | ≤ 30000 ms | 通过 |
| incremental P95 | 33.37 ms | ≤ 500 ms | 通过 |
| search P95 | 1.64 ms | ≤ 100 ms | 通过 |
| yield latency P95 | 0.27 ms | 记录项 | 正常 |
| heap delta | 30.24 MB | 记录项 | 正常 |

物化耗时 4490.94 ms，batch size 50，yield 200 次；报告 `passed: true`。

## 验证期间修复

1. ESLint 首次真正运行后发现 `CharacterManager` 读取 frontmatter ID 有一条 unsafe assignment；已先收窄为 `unknown` 再判定字符串，重跑 ESLint、type-check、定向测试和全量测试均通过。
2. `smoke-vault-setup` 在 Windows 上用 Node `cpSync` 递归复制带中文名称与特殊文件属性的 fixture 时进程直接退出，表现为 Vitest `ERR_IPC_CHANNEL_CLOSED`。已改为逐目录、逐文件确定性复制；专项 3/3、全量测试和 coverage 均通过。这也关闭了此前自动准备 smoke Vault 中途退出的问题。
3. 测试 stderr 中的磁盘读取、缓存写入和 Workspace 调用错误来自既有故障注入用例；所有相关断言通过。
4. `git diff --check` 对验证时已跟踪的源码修改未报告 whitespace error；随后纳入候选快照的历史 Markdown 证据使用了 Markdown 硬换行，覆盖率 HTML 也保留了 Istanbul 模板空白，因此未把该格式提示列为工程门禁。源码的 ESLint、Stylelint 与 TypeScript 门禁均为零错误。

## 结论

P0-093B 要求的 type-check、lint、test、coverage、CSS/i18n/Obsidian audit 与 10k benchmark 全部退出码 0，性能不低于冻结阈值，可以进入 P0-093C。
