# P0-081B View 订阅生命周期

日期：2026-09-11

状态：完成。

## 实现

- `NovelConsoleView.onOpen` 订阅 `ConsoleApplication`，同步 current 由首次 render 消费，避免打开时重复渲染。
- 后续 application 事件使用 50ms trailing debounce 合并进度突发，只在安静窗口后重建一次 Console DOM。
- 路由、项目切换等显式交互使用 immediate render，并取消待执行的订阅刷新，避免双重渲染。
- `onClose` 取消订阅、取消 timer、销毁布局并设置关闭标记；已经排队或迟到的事件不能再刷新 View。
- 未修改页面内容组件、索引领域结构或 P0-081C 状态面板。

## 自动验证

- `view-lifecycle.test.ts` 4 项覆盖早开 initializing 自动到 ready、晚开直接 ready、关闭后通知无效、进度突发防抖。
- View 生命周期、原 View、订阅、项目选择器和向导共 5 个文件、22/22 通过。
- 命令：`node node_modules/vitest/vitest.mjs run tests/console/view-lifecycle.test.ts tests/console/NovelConsoleView.test.ts tests/console/subscription.test.ts tests/console/project-selector.test.ts tests/console/onboarding.test.ts`。
- `node node_modules/typescript/bin/tsc --noEmit`、定向 ESLint 与 diff check 通过。

## 待用户验收候选

- 版本：0.22.0。
- 构建身份：`328e1ae884e2-dirty / 2026-09-11T01:33:32.003Z`。
- 安装目录：`D:\Career\test_20260910\.obsidian\plugins\web-novel-assistant`。
- artifact verifier：consistent，退出码 0。
- main.js：`72DBA9491140B667DFB426F65D4732076A2DEE6699DE204C1D2496143729A9A0`。
- styles.css：`17F0C8873A84BAA600BC62792A9A610BBBEC0E8EC38521F54C0E27C318C9EE8E`。
- manifest.json：`D6E2C8555B8AEB8BBC3DDFDF36889AA23D8007A8D19B1B8FC7463D2703472FBB`。

## 真实 Obsidian 验收

- 当前环境 Ctrl+R 不触发 Obsidian 重载，改用完整退出并重新打开应用的等价流程。
- 用户确认重开后 Console 自动恢复并进入 ready，无需重新导航，验收无问题。

## 回滚点

可独立回滚 View 的订阅字段、onOpen/onClose 接线与刷新调度；application/runtime 订阅契约保持可用，不影响旧插件入口或用户 Markdown。
