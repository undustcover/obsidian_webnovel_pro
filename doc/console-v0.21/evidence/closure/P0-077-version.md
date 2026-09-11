# P0-077A 版本口径

日期：2026-09-10  
功能规格版本：小说控制台 V0.21  
插件发布版本：0.21.9（Git 标签 `V0.219`）  
最低 Obsidian 版本：1.8.7

## 唯一版本规则

1. `manifest.json.version` 是 Obsidian 实际加载和展示的插件运行版本。
2. `package.json.version` 必须与 `manifest.json.version` 完全一致。
3. `versions.json[manifest.version]` 必须存在，并等于 `manifest.json.minAppVersion`。
4. “小说控制台 V0.21”是功能规格名称，不参与 Obsidian 插件版本比较；它固定映射到本轮插件发布版本 0.21.9，发布标签为 `V0.219`。
5. 3.9.4 仅作为用户指定的原版对照，不是本轮构建、安装或发布目标。

## 当前结果

| 来源 | 值 |
|---|---|
| `package.json.version` | `0.21.9` |
| `manifest.json.version` | `0.21.9` |
| `manifest.json.minAppVersion` | `1.8.7` |
| `versions.json["0.21.9"]` | `1.8.7` |
| README 功能/发布映射 | V0.21 → 0.21.9 / `V0.219` |

## 验证

- `tests/version-consistency.test.ts` 在构建前检查三个版本文件与中英文 README 映射。
- 缺少映射、版本不一致或 README 漂移都会使测试失败。

## 回滚点

README 版本说明、版本一致性测试和三个版本文件应作为同一发布口径维护；若改变插件版本，必须同批更新并重新验证，不能单独回滚其中一个文件。
