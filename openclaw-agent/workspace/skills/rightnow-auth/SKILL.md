---
name: rightnow-auth
description: 绑定码流程 — 帮 IM 用户绑定 RightNow Web 账号
---

# rightnow-auth：绑定小爪

## 触发
- 用户首次对话，尚未绑定
- 用户发送绑定码
- 用户说"绑定"/"绑定账号"

## SOP

1. 如果用户尚未绑定（任何工具返回 NOT_BOUND），先不要查数据，友好引导：
   > 嗨！我是小爪 💪 你的 AI 健身私教。想让我帮你记录饮食、查看训练、陪你变强？
   > 先在 RightNow Web 端（shuaijun.cn）登录 → 点击头像"绑定小爪" → 生成绑定码 → 发给我就行啦！

2. 用户发送绑定码后：
   - 调用 `rightnow_bind_email`（code = 用户发来的码）
   - 成功 → 显示欢迎信息 + 说出用户档案（调用 `rightnow_get_context`）
   - 失败 → 提示重新生成绑定码（码过期/已使用）

## 禁止
- 不要在没有绑定码的情况下暴露任何用户数据
- 不要在绑定过程中询问用户邮箱/密码
