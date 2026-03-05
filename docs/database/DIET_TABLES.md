# 饮食相关表

## Diet 表

饮食记录主表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| userId | String | ✓ | 用户ID (外键) |
| mealType | Enum | ✓ | 餐次类型 (breakfast/lunch/dinner/snack) |
| totalCalories | Int | ✓ | 总卡路里 |
| imageUrl | String | | 图片URL |
| notes | String | | 备注 |
| createdAt | DateTime | ✓ | 创建时间 |
| updatedAt | DateTime | ✓ | 更新时间 |

### 关系
- `user`: User (多对一)
- `foodItems`: FoodItem[] (一对多)

### 索引
```prisma
@@index([userId, createdAt])
@@index([createdAt])
```

## FoodItem 表

食物条目表

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | String | ✓ | 主键 (UUID) |
| dietId | String | ✓ | 饮食记录ID (外键) |
| name | String | ✓ | 食物名称 |
| amount | String | ✓ | 数量 (如"2个", "100g") |
| calories | Int | ✓ | 卡路里 |
| protein | Float | | 蛋白质 (g) |
| carbs | Float | | 碳水化合物 (g) |
| fat | Float | | 脂肪 (g) |
| createdAt | DateTime | ✓ | 创建时间 |

### 关系
- `diet`: Diet (多对一)

### 索引
```prisma
@@index([dietId])
```

## MealType 枚举

```prisma
enum MealType {
  breakfast  // 早餐
  lunch      // 午餐
  dinner     // 晚餐
  snack      // 加餐
}
```

## 示例查询

### 创建饮食记录
```typescript
const diet = await prisma.diet.create({
  data: {
    userId: 'user_123',
    mealType: 'breakfast',
    totalCalories: 500,
    imageUrl: 'https://...',
    foodItems: {
      create: [
        {
          name: '鸡蛋',
          amount: '2个',
          calories: 140,
          protein: 12,
          carbs: 1,
          fat: 10
        }
      ]
    }
  },
  include: {
    foodItems: true
  }
});
```

### 查询用户某日饮食
```typescript
const diets = await prisma.diet.findMany({
  where: {
    userId: 'user_123',
    createdAt: {
      gte: new Date('2026-03-05T00:00:00Z'),
      lt: new Date('2026-03-06T00:00:00Z')
    }
  },
  include: {
    foodItems: true
  },
  orderBy: {
    createdAt: 'asc'
  }
});
```
