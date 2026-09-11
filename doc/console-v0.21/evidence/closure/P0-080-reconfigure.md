# P0-080B 运行时 reconfigure

日期：2026-09-11

## 实现

- `ConsoleIndexRuntime.reconfigure` 先规范化并校验全部项目，再为每个项目建立候选 context、加载匹配缓存并完成扫描。
- 重配置期间到达的文件事件会同时作用于旧 contexts 并排队追赶候选 contexts；追赶完成后才原子替换运行时映射。
- 保留仍有效的 active project；失效时回退到首个项目，空项目列表进入 unconfigured。
- 候选扫描或配置校验失败会释放候选 contexts，旧 contexts、active project 与 snapshot 不变。
- 设置页和首次向导通过 `ConsoleApplication.reconfigureProjects` 接线；持久化成功但重配置失败时回滚旧设置。

## 自动验证

- `reconfigure.test.ts` 4 项覆盖新增/删除/改 root、有效 active project、重复 ID、候选扫描失败和空配置。
- `project-settings-model.test.ts` 7 项覆盖设置保存、非法输入零写入和重配置失败回滚。
- 命令：`node node_modules/vitest/vitest.mjs run tests/console/reconfigure.test.ts tests/console/project-settings-model.test.ts`，11/11 通过。
- `node node_modules/typescript/bin/tsc --noEmit` 与定向 ESLint 通过。

## 集成边界

测试从设置持久化协调器进入 application/runtime，并验证保存后的运行时项目映射无需插件重载即可获得已扫描 snapshot。未写入用户 Markdown。

## 回滚点

同批回滚 runtime reconfigure、application 门面与设置保存接线；失败路径始终保留旧 contexts 和旧 snapshot。
