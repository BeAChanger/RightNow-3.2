# 完整数据库Schema

## User 表

用户表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| email | String | ✓ | 邮箱 (唯一) |
| password | String | ✓ | 密码 (加密) |
| nickname | String | ✓ | 昵称 |
| avatar | String | | 头像URL |
| gender | String | | 性别 (male/female) |
| birthDate | DateTime | | 生日 |
| height | Float | | 身高 (cm) |
| targetWeight | Float | | 目标体重 (kg) |
| createdAt | DateTime | ✓ | 创建时间 |
| updatedAt | DateTime | ✓ | 更新时间 |

### 关系
- `diets`: Diet[]
- `posts`: Post[]
- `comments`: Comment[]
- `likes`: Like[]
- `checkIns`: CheckIn[]
- `weightRecords`: WeightRecord[]

## Diet 表

参考: [饮食相关表](DIET_TABLES.md)

## FoodItem 表

参考: [饮食相关表](DIET_TABLES.md)

## Post 表

参考: [社区相关表](COMMUNITY_TABLES.md)

## Comment 表

参考: [社区相关表](COMMUNITY_TABLES.md)

## Like 表

参考: [社区相关表](COMMUNITY_TABLES.md)

## CheckIn 表

参考: [社区相关表](COMMUNITY_TABLES.md)

## WeightRecord 表

体重记录表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| userId | String | ✓ | 用户ID (外键) |
| weight | Float | ✓ | 体重 (kg) |
| bodyFat | Float | | 体脂率 (%) |
| muscleMass | Float | | 肌肉量 (kg) |
| notes | String | | 备注 |
| createdAt | DateTime | ✓ | 记录时间 |

### 关系
- `user`: User (多对一)

### 索引
```prisma
@@index([userId, createdAt])
```

## Prisma Schema示例

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String
  nickname      String
  avatar        String?
  gender        String?
  birthDate     DateTime?
  height        Float?
  targetWeight  Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  diets         Diet[]
  posts         Post[]
  comments      Comment[]
  likes         Like[]
  checkIns      CheckIn[]
  weightRecords WeightRecord[]
}

model Diet {
  id            String   @id @default(uuid())
  userId        String
  mealType      MealType
  totalCalories Int
  imageUrl      String?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])
  foodItems     FoodItem[]

  @@index([userId, createdAt])
}

enum MealType {
  breakfast
  lunch
  dinner
  snack
}
```
