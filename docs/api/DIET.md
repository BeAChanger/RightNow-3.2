# 饮食接口文档

## 创建饮食记录

**POST** `/api/diet`

### 请求
```json
{
  "mealType": "breakfast",
  "foodItems": [
    {
      "name": "鸡蛋",
      "amount": "2个",
      "calories": 140
    }
  ],
  "totalCalories": 500,
  "imageUrl": "https://...",
  "notes": "早餐"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "diet_123",
    "userId": "user_456",
    "mealType": "breakfast",
    "totalCalories": 500,
    "createdAt": "2026-03-05T07:26:45.352Z"
  }
}
```

## 获取饮食列表

**GET** `/api/diet?date=2026-03-05`

### 查询参数
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| date | string | 否 | 日期 (YYYY-MM-DD) |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

### 响应
```json
{
  "success": true,
  "data": [
    {
      "id": "diet_123",
      "mealType": "breakfast",
      "totalCalories": 500,
      "imageUrl": "https://...",
      "createdAt": "2026-03-05T08:00:00Z"
    }
  ]
}
```

## 拍照识别

**POST** `/api/diet/recognize`

### 请求
```json
{
  "imageUrl": "https://..."
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "foodItems": [
      {
        "name": "鸡蛋",
        "amount": "2个",
        "calories": 140,
        "protein": 12,
        "carbs": 1,
        "fat": 10
      }
    ],
    "totalCalories": 500,
    "confidence": 0.95
  }
}
```

## 营养统计

**GET** `/api/diet/stats?startDate=2026-03-01&endDate=2026-03-05`

### 响应
```json
{
  "success": true,
  "data": {
    "totalCalories": 8500,
    "avgCalories": 1700,
    "totalProtein": 425,
    "totalCarbs": 850,
    "totalFat": 283
  }
}
```
