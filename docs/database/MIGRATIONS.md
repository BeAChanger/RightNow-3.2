# 数据库迁移指南

## 创建新迁移

### 1. 修改Schema
编辑 `backend/prisma/schema.prisma`

### 2. 创建迁移
```bash
cd backend
npx prisma migrate dev --name add_new_field
```

### 3. 检查生成的SQL
查看 `prisma/migrations/` 目录下的新迁移文件

### 4. 应用到生产
```bash
npx prisma migrate deploy
```

## 常见迁移操作

### 添加新表
```prisma
model NewTable {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

### 添加字段
```prisma
model User {
  // 现有字段...
  newField String? // 可选字段
}
```

### 添加关系
```prisma
model Post {
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

### 添加索引
```prisma
model Post {
  @@index([userId, createdAt])
}
```

## 回滚迁移

```bash
# 回滚到指定迁移
npx prisma migrate resolve --rolled-back migration_name

# 重置数据库（危险操作）
npx prisma migrate reset
```

## 注意事项

- 生产环境使用 `migrate deploy`，不要用 `migrate dev`
- 删除字段前确认数据已备份
- 修改字段类型可能导致数据丢失
- 添加非空字段需要提供默认值
