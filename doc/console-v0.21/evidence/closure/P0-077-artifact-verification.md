# P0-077C 候选包校验

日期：2026-09-10

## 实现

- 新增 `scripts/verify-plugin-artifacts.mjs` 和 `npm run verify:artifact`。
- 输入为构建目录与测试 Vault 插件目录；不自动寻找、覆盖或删除 Vault。
- 固定检查 `main.js`、`styles.css`、`manifest.json` 的存在性与 SHA-256，并比较 manifest 版本。
- 退出码：`0` 一致、`2` 缺文件、`3` hash 或版本不一致；CLI 参数错误返回 `64`。
- README 已补充中英文命令、退出码和最小发布包说明。

## 窄测试

`tests/artifact-verifier.test.ts` 覆盖三个独立 CLI 进程场景：

| 场景 | 预期退出码 | 结果 |
|---|---:|---|
| 三项文件与版本一致 | 0 | 通过 |
| 安装目录缺 `styles.css` | 2 | 通过 |
| 安装目录 `main.js` 内容不同 | 3 | 通过 |

`tsc --noEmit` 退出码 0。

## 集成验收

当前仓库与 `D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant` 比较结果为 `consistent`、退出码 0：

| 文件 | SHA-256 |
|---|---|
| `main.js` | `930455EA4044BD591132833C4E9F6C67D8F4E5A74200962D0DCBCE5A5A8E0C18` |
| `styles.css` | `ED4BCB079E50E05745D98FE2534E299F96EDB5895696C5E62DB9FD0C553BFA95` |
| `manifest.json` | `D6E2C8555B8AEB8BBC3DDFDF36889AA23D8007A8D19B1B8FC7463D2703472FBB` |

对校正前候选备份运行同一校验器，返回 `mismatch`、退出码 3，并精确指出 `main.js`：仓库 hash 为 `930455...E0C18`，旧候选为 `8EB383...27658`。由此证明脚本能识别实际发生过的 bundle 漂移。

## 父任务验证

P0-077 完成后执行 lint 全链：CSS 构建、Stylelint、CSS audit、Console CSS scope audit、ESLint、Obsidian API audit、i18n audit 均退出码 0。Obsidian API audit 仅保留既有建议，无失败。

## 回滚点

校验器、测试和 package script 可同批移除，不影响插件运行；README 对最小发布包的警告应保留，避免再次把开发仓库误装进 Vault。
