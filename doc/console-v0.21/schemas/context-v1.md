---
schema_version: console.context.v1
plan_id: "{{planId}}"
generated_at: "{{generatedAt}}"
snapshot_version: "{{snapshotVersion}}"
target_kind: "{{target.kind}}"
target_key: "{{target.key}}"
---

# Codex 上下文

## 目标

{{target.title}}（`{{target.key}}`）

## 策略与知识边界

- 关系深度：{{policy.relationDepth}}
- 事件前置深度：{{policy.eventPrerequisiteDepth}}
- 默认治理过滤：canon + active + current
- 本次允许揭示：{{policy.allowedReveal}}

## 自动纳入

{{#autoIncluded}}
- `{{idOrKey}}` · `{{path}}` · {{type}} · {{title}}
  - 原因：{{reasons}}
  - 关系：{{relationship}}
  - 权威/生命周期/范围/复核：{{governance}}
  - 知识边界：{{knowledgeBoundary}}
  - 摘要：{{summary}}
{{/autoIncluded}}

## 手动纳入

{{#manualIncluded}}
- `{{idOrKey}}` · `{{path}}` · {{title}} — {{reasons}}
{{/manualIncluded}}

## 手动排除

{{#manualExcluded}}
- `{{idOrKey}}` · `{{path}}` · {{title}} — {{reasons}}
{{/manualExcluded}}

## 冲突与警告

{{#conflicts}}
- {{.}}
{{/conflicts}}
