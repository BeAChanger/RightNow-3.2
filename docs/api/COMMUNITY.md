# 社区接口文档

## 发布动态

**POST** `/api/community/posts`

### 请求
```json
{
  "content": "今天完成了训练计划！",
  "images": ["https://...", "https://..."],
  "type": "checkin"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "post_123",
    "userId": "user_456",
    "content": "今天完成了训练计划！",
    "images": ["https://..."],
    "type": "checkin",
    "createdAt": "2026-03-05T07:26:45.352Z"
  }
}
```

## 获取动态列表

**GET** `/api/community/posts?page=1&limit=20`

### 响应
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "post_123",
        "user": {
          "id": "user_456",
          "nickname": "用户昵称",
          "avatar": "https://..."
        },
        "content": "今天完成了训练计划！",
        "images": ["https://..."],
        "likes": 10,
        "comments": 5,
        "isLiked": false,
        "createdAt": "2026-03-05T07:26:45.352Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

## 点赞

**POST** `/api/community/posts/:postId/like`

### 响应
```json
{
  "success": true,
  "data": {
    "isLiked": true,
    "likesCount": 11
  }
}
```

## 评论

**POST** `/api/community/posts/:postId/comments`

### 请求
```json
{
  "content": "加油！"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "comment_123",
    "postId": "post_123",
    "userId": "user_456",
    "content": "加油！",
    "createdAt": "2026-03-05T07:26:45.352Z"
  }
}
```

## 打卡记录

**POST** `/api/community/checkin`

### 请求
```json
{
  "type": "body",
  "images": ["https://..."],
  "weight": 70.5,
  "bodyFat": 15.2,
  "notes": "今日打卡"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "id": "checkin_123",
    "userId": "user_456",
    "type": "body",
    "createdAt": "2026-03-05T07:26:45.352Z"
  }
}
```
