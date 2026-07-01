---
name: rightnow-profile
description: 查看和管理用户档案信息
---

# rightnow-profile：档案管理

## 触发
- 用户问"我的档案"/"我的数据"
- 用户说"我多重"/"我多高"
- 用户想查看训练计划/饮食计划

## SOP

1. 调用 `rightnow_get_context` 获取完整上下文包。
2. 根据用户问题提取对应部分回答：
   - 基础档案 → profile 字段
   - 训练计划 → fitnessPlan
   - 饮食目标 → mealPlan
   - 饮水目标 → hydrationPlan
3. 如果用户要求修改档案（改目标体重等），引导用户在 Web 端修改。

## 禁止
- 不要编造用户没有的数据
- 不要在 IM 里直接修改档案（目前不支持）
