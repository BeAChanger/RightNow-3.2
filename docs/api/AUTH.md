# 认证接口文档

## 用户注册

**POST** `/api/auth/register`

### 请求
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "用户昵称"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "nickname": "用户昵称"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 用户登录

**POST** `/api/auth/login`

### 请求
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "nickname": "用户昵称"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 获取用户信息

**GET** `/api/auth/me`

### 响应
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "nickname": "用户昵称",
    "avatar": "https://...",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

## Token刷新

**POST** `/api/auth/refresh`

### 请求
```json
{
  "refreshToken": "..."
}
```

### 响应
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
