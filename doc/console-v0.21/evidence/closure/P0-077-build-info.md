# P0-077B 构建身份

日期：2026-09-10

## 实现

- `scripts/build-plugin.mjs` 从 `manifest.json` 取得版本，读取 Git commit 与工作树状态，并生成 UTC ISO 构建时间。
- 缺少 Git 时 commit 稳定降级为 `unknown`；未经过发布构建的测试/开发模块稳定显示 `development`。
- 构建身份通过 esbuild 常量注入 `main.js`，不包含机器路径、用户名、环境变量内容或密钥。
- Console 工具栏提供折叠式只读“构建诊断”，显示插件版本、commit 和构建时间。
- `SOURCE_DATE_EPOCH` 可固定构建时间，支持可复现候选包。

## 验证

- `tests/console/build-info.test.ts`：字段、格式和缺注入降级；通过。
- `tests/version-consistency.test.ts`：运行版本与版本文件一致；通过。
- `tests/console/NovelConsoleView.test.ts`：原 View 契约未回归；通过。
- `tsc --noEmit`：通过。
- 构建日志只输出一个身份：`WebNovel Assistant 0.22.0 (328e1ae884e2-dirty, 2026-09-10T06:55:36.092Z)`。
- bundle 已检出相同的 `0.22.0`、`328e1ae884e2-dirty`、`2026-09-10T06:55:36.092Z` 字段。
- 已部署到测试 Vault 的正确插件目录；`main.js` SHA-256 为 `930455EA4044BD591132833C4E9F6C67D8F4E5A74200962D0DCBCE5A5A8E0C18`。
- 用户已在真实 Obsidian 的 Console“构建诊断”确认显示：`插件 0.22.0 · commit 328e1ae884e2-dirty · 构建时间 2026-09-10T06:55:36.092Z`，与构建日志完全一致。

## 回滚点

可同批恢复原 `build` 命令、移除 build-info 模块与 Console 诊断区；不影响索引和现有 Console 功能。
