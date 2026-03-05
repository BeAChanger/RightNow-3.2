# AI教练模块

## 功能概述

基于Google Gemini的AI对话教练，提供个性化训练建议、饮食指导和进度分析。

## 前端实现

### 主要文件
- `frontend/src/views/AIChat.tsx` - AI对话界面

### 核心功能
1. **对话交互**: 实时对话
2. **上下文记忆**: 记住用户信息
3. **建议生成**: 训练和饮食建议
4. **历史记录**: 查看对话历史

### 状态管理
```tsx
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

### API调用
```tsx
const response = await fetch('http://localhost:3100/api/ai-coach/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ message: input })
});
```

## 后端实现

### 模块位置
`backend/src/ai-coach/`

### 核心服务
```typescript
async chat(userId: string, message: string) {
  // 获取用户上下文
  const context = await this.getUserContext(userId);

  // 调用Gemini API
  const response = await this.geminiService.chat(message, context);

  // 保存对话历史
  await this.saveMessage(userId, message, response);

  return response;
}
```

## 参考文档

- [AI教练API](../api/AI_COACH.md)
