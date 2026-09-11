# P0-079A 项目表单模型

日期：2026-09-10

## 实现边界

- 新增 `src/console/config/projectForm.ts`，只负责创建草稿、字段校验和生成 `ConsoleProjectConfig` 预览。
- 草稿将数值保留为表单字符串；只有全部字段合法时才产生 preview，非法输入不会产生部分配置。
- 根目录及七类目录别名统一去除首尾空白、统一路径分隔符、折叠重复斜杠并去除首尾斜杠。
- 编辑已有项目时深拷贝 `fieldAliases`，避免表单草稿修改污染现有设置。
- 模块不依赖插件设置管理器、Vault adapter 或 Markdown persistence，因此没有保存和文件写入能力。

## 稳定断言

- 默认草稿包含项目 ID/代码、七类默认目录和全部整数默认值。
- projectId、projectCode、root 及每个目录均提供字段级必填错误。
- activationDistance 为 1～5；contextDepth/eventPrerequisiteDepth 为 0～5；四项性能整数使用现有 normalize 逻辑的相同边界。
- 合法 preview 传给 `normalizeConsoleProjects([preview])` 后无诊断且内容不变，证明可直接交给现有规范化入口。

## 验证

- `tests/console/project-form.test.ts` 与 `tests/console/project-config.test.ts`：2 个文件、15 项测试通过，退出码 0。
- `tsc --noEmit`：退出码 0。
- 对新增实现与测试运行 ESLint（`--max-warnings=0`）：退出码 0。
- `git diff --check`：无空白错误；仅报告工作区既有 LF/CRLF 转换提示。

## 回滚点

删除 `projectForm.ts`、对应导出与测试即可；不会回滚或删除任何用户设置和 Markdown。
