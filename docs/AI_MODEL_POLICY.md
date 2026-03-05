# AI 模型策略

最后更新：2026-03-05

参考来源：
- https://ai.google.dev/gemini-api/docs?hl=zh-cn

## 当前固定规则

- 所有互动/对话类能力（文本对话、图文对话）统一使用 `gemini-3-flash-preview`。
- 作图能力使用双模型主备：
  - 默认：`gemini-3.1-flash-lite-preview`
  - 失败回退：`gemini-3.1-flash-image-preview`

## 代码落地约束

- 任何新增对话接口，默认不得引入其他聊天模型。
- 任何新增作图接口，必须保留主备切换逻辑。
- 修改模型策略时，必须同步更新本文件与对应服务常量。
