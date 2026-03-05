# 社区相关表

## Post 表

动态/帖子表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| userId | String | ✓ | 用户ID (外键) |
| content | String | ✓ | 内容 |
| images | String[] | | 图片URL数组 |
| type | String | | 类型 (checkin/share/question) |
| likesCount | Int | ✓ | 点赞数 (默认0) |
| commentsCount | Int | ✓ | 评论数 (默认0) |
| createdAt | DateTime | ✓ | 创建时间 |
| updatedAt | DateTime | ✓ | 更新时间 |

### 关系
- `user`: User (多对一)
- `comments`: Comment[] (一对多)
- `likes`: Like[] (一对多)

### 索引
```prisma
@@index([userId])
@@index([createdAt])
```

## Comment 表

评论表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| postId | String | ✓ | 动态ID (外键) |
| userId | String | ✓ | 用户ID (外键) |
| content | String | ✓ | 评论内容 |
| createdAt | DateTime | ✓ | 创建时间 |

### 关系
- `post`: Post (多对一)
- `user`: User (多对一)

### 索引
```prisma
@@index([postId])
@@index([userId])
```

## Like 表

点赞表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| postId | String | ✓ | 动态ID (外键) |
| userId | String | ✓ | 用户ID (外键) |
| createdAt | DateTime | ✓ | 创建时间 |

### 关系
- `post`: Post (多对一)
- `user`: User (多对一)

### 唯一约束
```prisma
@@unique([postId, userId])
```

## CheckIn 表

打卡记录表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| userId | String | ✓ | 用户ID (外键) |
| type | String | ✓ | 类型 (body/exercise/diet) |
| images | String[] | | 图片URL数组 |
| weight | Float | | 体重 (kg) |
| bodyFat | Float | | 体脂率 (%) |
| notes | String | | 备注 |
| createdAt | DateTime | ✓ | 创建时间 |

### 关系
- `user`: User (多对一)

### 索引
```prisma
@@index([userId, createdAt])
```
