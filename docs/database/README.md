# 数据库文档导航

## 概述

- **数据库**: PostgreSQL
- **ORM**: Prisma
- **Schema位置**: `backend/prisma/schema.prisma`

## 文档列表

### [完整Schema](SCHEMA.md)
完整的数据库表结构定义

### [饮食相关表](DIET_TABLES.md)
- Diet (饮食记录)
- FoodItem (食物条目)

### [社区相关表](COMMUNITY_TABLES.md)
- Post (动态)
- Comment (评论)
- Like (点赞)
- CheckIn (打卡)

### [迁移指南](MIGRATIONS.md)
数据库迁移操作指南

## 快速操作

```bash
# 查看当前Schema
npx prisma db pull

# 创建迁移
npx prisma migrate dev --name your_migration_name

# 应用迁移
npx prisma migrate deploy

# 重置数据库
npx prisma migrate reset

# 生成Prisma Client
npx prisma generate
```

## 命名规范

- 表名: PascalCase (User, Diet, FoodItem)
- 字段名: camelCase (userId, createdAt)
- 关系字段: 单数/复数对应 (user/users)
