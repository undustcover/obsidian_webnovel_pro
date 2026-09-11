# P0-081C 索引状态与恢复面板

日期：2026-09-11

状态：完成。

## 实现

- 新增 `IndexStatusPanel`，分别显示 unconfigured、initializing、ready、degraded、error 五态标题与可读消息，不以颜色或裸状态码代替含义。
- initializing 显示原生 progress 与 processed/total；ready/degraded 显示记录数和 snapshot version。
- degraded 显示全部失败文件；error 显示用户消息与可展开 technical detail。
- 只按 `suggestedActions` 与 `retryable` 渲染配置、重试、清缓存重建按钮；均为带 aria-label 的原生 button。
- 恢复动作共享 loading/disabled 状态，并通过 aria-live 区域报告执行成功或详细失败原因。
- 配置动作优先聚焦当前页首次配置表单；无表单时打开插件设置页。
- 新增中英文 i18n 键与 Console 作用域 CSS；窄布局下恢复按钮可换行扩展。

## 自动验证

- `index-status-panel.test.ts` 8 项覆盖五态、进度、记录数、失败文件、技术详情、按钮权限、aria 与动作失败反馈。
- 状态面板、View 生命周期、订阅、向导、项目选择器与无障碍共 7 个文件、33/33 通过。
- `node node_modules/typescript/bin/tsc --noEmit`、定向 ESLint/Stylelint、Console CSS scope audit、i18n audit 与 diff check 通过。

## 真实 Obsidian 验收

- 候选构建：`0.22.0 / 328e1ae884e2-dirty / 2026-09-11T02:24:18.432Z`。
- 安装目录：`D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant`；artifact verifier 返回 consistent。
- main.js：`DF7C89CE0D4065BAA7CB2886465097FA2CDE3455C46FA2C7338ED12BD824B470`。
- styles.css：`6EDAB8D97D21545ADEC102EC74D30A86AC127B4E30643AC7D02464AC8A7DAA09`。
- manifest.json：`D6E2C8555B8AEB8BBC3DDFDF36889AA23D8007A8D19B1B8FC7463D2703472FBB`。

- G-01：空项目配置显示可操作 unconfigured，而非技术性 ERROR。
- G-02：Console 内可配置项目，设置保存后无需重载即可恢复 ready。
- G-03：索引状态变化后 View 自动刷新，无需重新导航。
- G-04：扫描失败显示原因、技术详情与 retry/rebuild；动作失败在页面内反馈，恢复后回到 ready。
- 用户确认以上 G-01～G-04 全部通过。
- DevTools 首次粘贴被 Chromium self-XSS 防护拦截；用户按浏览器提示手动输入 `allow pasting` 后完成受控故障注入。该提示不是插件错误。

## 回滚点

可回滚 IndexStatusPanel、NovelConsoleView 接线、对应 CSS/i18n 与测试；不影响旧功能 View，不删除设置、缓存以外数据或用户 Markdown。
