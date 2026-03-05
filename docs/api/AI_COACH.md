# AI教练接口文档

## 发送对话消息

**POST** `/api/ai-coach/chat`

### 请求
```json
{
  "message": "我今天应该做什么训练？",
  "context": {
    "currentWeight": 70,
    "targetWeight": 65
  }
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "reply": "根据你的目标，建议今天进行...",
    "suggestions": ["有氧运动30分钟", "力量训练"],
    "conversationId": "conv_123"
  }
}
```

## 生成训练计划

**POST** `/api/ai-coach/plan`

### 请求
```json
{
  "goal": "减脂",
  "duration": 30,
  "level": "beginner"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "planId": "plan_123",
    "title": "30天减脂计划",
    "weeks": [
      {
        "week": 1,
        "days": [
          {
            "day": 1,
            "exercises": [...]
          }
        ]
      }
    ]
  }
}
```

## 获取AI建议

**GET** `/api/ai-coach/suggestions`

### 响应
```json
{
  "success": true,
  "data": {
    "diet": "今日建议摄入1500卡路里",
    "exercise": "建议进行有氧运动",
    "rest": "保证8小时睡眠"
  }
}
```

## 获取对话历史

**GET** `/api/ai-coach/history?limit=20`

### 响应
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "我今天应该做什么训练？",
      "createdAt": "2026-03-05T07:26:45.352Z"
    },
    {
      "id": "msg_124",
      "role": "assistant",
      "content": "根据你的目标...",
      "createdAt": "2026-03-05T07:26:50.352Z"
    }
  ]
}
```
