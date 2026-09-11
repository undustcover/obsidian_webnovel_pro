# P0-084B 设定类型页面

日期：2026-09-11  
状态：完成。

## 实现

- WRL/CHR/ORG/LOC/ITM/ABL/TRM 七个路由分别绑定 world/character/organization/location/item/ability/term。
- 通用详情显示正式类型/ID、治理状态、有限核心字段、显式关系与来源；过滤正文/body，避免详情复制长文。
- legacy 记录继续显示 `Legacy`，不冒充正式永久 ID。

## 验证

路由与页面语义测试证明人物/道具/unknown 不串页；generic detail 测试证明核心字段与关系可见、正文不进入详情。完整 Console 回归通过。

## 回滚点

共享列表仍可保留，七个定义和详情增强可独立撤回。
