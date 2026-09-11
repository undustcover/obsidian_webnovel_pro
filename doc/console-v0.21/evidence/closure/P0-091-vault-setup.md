# P0-091A 四类真实测试 Vault 准备

日期：2026-09-11

## 可重建环境

- 新增 `prepare-console-smoke-vaults.ts`，只接受不存在或空的目标目录，不删除或覆盖已有 Vault。
- 生成 `fresh`、`legacy-workspace`、`minimal`、`mixed-legacy` 四个隔离 Vault；测试数据分别为 0、3、9、8 个 Markdown。
- `fresh` 不预写插件 `data.json`；旧格式 Vault 使用 legacy `workspaceFolders`；minimal 和 mixed-legacy 使用规范 `consoleProjects`。
- 每个 Vault 安装同一份 `main.js`、`styles.css`、`manifest.json`，启用同一插件 ID，并生成 `smoke-manifest.json`。

## 当前候选身份

- 插件：0.22.0
- 构建：`328e1ae884e2-dirty`
- 构建时间：`2026-09-11T07:06:23.151Z`
- main.js：`bd29ef20ecef88b18516b518c8896bde175c9c72e664997ab41377eb113fb0b3`
- styles.css：`a5ed91ad44efe389b190541a864b9125ed45df3729ffff6f27d0cd5a8e211504`
- manifest.json：`d6e2c8555b8aeb8bbc3ddfdf36889aa23d8007a8d19b1b8fc7463d2703472fbb`

实际生成目录：`D:\Career\webnovel_pro\wave9-smoke-vaults`。四个 Vault 的上述 hash 完全一致，清单位于该目录的 `smoke-manifest.json`。

## P0-091C 缺陷修复候选（fix1）

P0-091C 的首次实机执行暴露了“新文件写入成功但索引使用旧 MetadataCache”以及“上下文输出目录不存在”两个缺陷。修复后重新构建并生成一组全新的隔离 Vault，保留原测试现场不覆盖：

- Vault 根目录：`D:\Career\webnovel_pro\wave9-smoke-vaults-fix1`
- 构建：`328e1ae884e2-dirty`
- 构建时间：`2026-09-11T07:40:46.840Z`
- main.js：`1cd9fdd29ef73534adda1b9541a24484b23fec41c717c1e0781b73d7000a4c80`
- styles.css：`a5ed91ad44efe389b190541a864b9125ed45df3729ffff6f27d0cd5a8e211504`
- manifest.json：`d6e2c8555b8aeb8bbc3ddfdf36889aa23d8007a8d19b1b8fc7463d2703472fbb`
- artifact verifier：构建目录与 fix1 minimal 安装目录三产物完全一致，exit 0
- 完整工程：125 个测试文件、1271/1271 项通过；type-check、ESLint、Stylelint、CSS/Console CSS、Obsidian、i18n、错误反馈审计全部通过

## 自动验证

- `smoke-vault-setup.test.ts` 2/2：矩阵、Markdown 数量、关键路径、三产物同源 hash、篡改检测和非空目标拒绝。
- fixture/setup 合并 10/10，完整工程 125 个文件、1268/1268 通过；type-check 和完整 lint/audit 通过。

## P0-091D 候选（fix2）

- Vault 根目录：`D:\Career\webnovel_pro\wave9-smoke-vaults-fix2`
- 构建时间：`2026-09-11T08:26:25.329Z`
- main.js：`83d3c05ba0920ed2617538535e040659f0c0d078353bdea1cbbb66cb585db6d1`
- styles.css：`a5ed91ad44efe389b190541a864b9125ed45df3729ffff6f27d0cd5a8e211504`
- manifest.json：`d6e2c8555b8aeb8bbc3ddfdf36889aa23d8007a8d19b1b8fc7463d2703472fbb`
- 完整工程 125 个测试文件、1272/1272 项通过；全部 lint/audit 通过。
- `mixed-legacy` 预置损坏的派生索引缓存 `console-index-v1-project-1.json`；Markdown 基线未修改，供 P0-091D 验证启动时安全重建。

## 数据安全

只使用仓库内合成 fixture 和新建的隔离目录；没有读取、复制或修改生产 Vault/个人稿件。删除这些临时 Vault 即可回滚，不影响仓库或用户数据。
