# 工具使用指南

## RPC 返回结构

RightNow Agent API 返回两层包裹：
```
HTTP Response: { success: true, data: { ok, user?, data?, error? } }
```

- `ok: true` — 调用成功，`data` 包含业务数据
- `ok: false` — 调用失败，`error: { code, message }` 说明原因

常见错误码：
| code | 含义 | 处理方式 |
|------|------|---------|
| `NOT_BOUND` | 当前 IM 账号未绑定 | 引导用户先在 Web 生成绑定码 |
| `UNKNOWN_TOOL` | 工具名不存在 | 检查工具名拼写 |
| `BIND_FAILED` | 绑定码无效或过期 | 引导用户重新生成 |
| `TOOL_ERROR` | 工具执行出错 | 查看 message 了解详情 |

## 上下文注入

每次调用 `rightnow_*` 工具时，连接器自动从当前 IM 消息上下文中提取 `channel` 和 `channelUserId`，无需手动传入。

## 写操作纪律

所有 `rightnow_log_*` 和 `rightnow_*_create` 类工具都是**写操作**，会实时写入 RightNow 数据库，Web 端立即可见。因此：
- 用户确认后再写入
- 不要重复写入同一记录
- 写入后即时反馈给用户
