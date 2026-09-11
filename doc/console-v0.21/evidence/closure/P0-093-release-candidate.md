# P0-093C 发布候选固化

- 日期：2026-09-11
- 状态：通过
- 候选版本：`0.21.9`
- 固定提交：`c33b2f4eb1a69decfc9c54e38bfa655c4c98e0fc`
- 内嵌构建身份：`c33b2f4eb1a6`
- 固定构建时间：`2026-09-11T13:48:29.000Z`
- 候选目录：`G:\career\2026\webnovel_pro\p093-release-candidate-0.21.9-c33b2f4`

## 构建约束

构建开始前 `git status --short` 无输出；构建脚本读取固定提交，并以该提交时间作为 `SOURCE_DATE_EPOCH`。候选三件套均来自同一次构建，不使用 dev watch 产物。以相同提交和时间戳再次构建后，三个 SHA-256 均保持一致。

锁文件未更新：

- `package-lock.json`：`8838CCD279B8F9BE9E75A1D372BD8EFB1C1ECA28E2D3C5C55F4B54CBC4BABAC8`
- `pnpm-lock.yaml`：`797E9410E4AFDF49B959A10A1DAF54E1559659E5C4B87E5C5EF0C43B5AB54810`

## 候选产物

| 文件 | SHA-256 |
|---|---|
| `main.js` | `3397FBB81AB4CF7D257C38479C63AB8C20DCAF49843B370FA24EAF6CED9DE14B` |
| `styles.css` | `A5ED91AD44EFE389B190541A864B9125ED45DF3729FFFF6F27D0CD5A8E211504` |
| `manifest.json` | `772133B186DCE5816C33CE7452BBAA4F55B7AB4F0E60655B1C427DE681B11B97` |

候选目录同时包含 `BUILD-INFO.json`、`SHA256SUMS.txt`、两份锁文件，以及四套已安装同一候选三件套的 smoke Vault。

## 窄校验与最低可用场景

1. 对 `fresh`、`legacy-workspace`、`minimal`、`mixed-legacy` 四个 Vault 分别运行产物校验器；四次均返回 `status=consistent`、退出码 0、版本 `0.21.9`，无 missing 或 mismatch。
2. 定向候选测试 7/7 文件、66/66 项通过，覆盖版本一致性、构建身份、产物一致/缺失/不一致识别、四类 Vault 准备与校验、首次使用、旧配置迁移、错误恢复、34 条路由行为和 16 条动作可达性。
3. 因上述自动化场景明显超过最低 10 项，P0-093C 集成验收通过。

## 结论

发布候选已从唯一固定提交构建并固化。下一步 P0-093D 必须直接使用本目录中的候选包进行真实 Obsidian 复验；任何后续源码或 dev watch 产物均不得替换它。
