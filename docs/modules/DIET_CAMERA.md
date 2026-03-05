# 饮食拍摄模块

## 功能概述

用户通过拍照或上传图片记录饮食，AI识别食物并自动计算营养信息。

## 前端实现

### 主要文件
- `frontend/src/views/DietLog.tsx` - 饮食记录主页面
- `frontend/src/views/ActionCenter.tsx` - 拍照/上传中心
- `frontend/src/components/` - 相关组件

### 核心功能
1. **拍照/上传**: 调用相机或选择相册
2. **AI识别**: 发送图片到后端识别
3. **编辑记录**: 修改识别结果
4. **保存记录**: 保存到数据库
5. **查看历史**: 按日期查看饮食记录

### 状态管理
```tsx
const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
const [imageUrl, setImageUrl] = useState<string>('');
const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
const [isRecognizing, setIsRecognizing] = useState(false);
```

### API调用
```tsx
// 识别食物
const response = await fetch('http://localhost:3100/api/diet/recognize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ imageUrl })
});

// 保存记录
await fetch('http://localhost:3100/api/diet', {
  method: 'POST',
  body: JSON.stringify({ mealType, foodItems, totalCalories, imageUrl })
});
```

## 后端实现

### 模块位置
`backend/src/diet/`

### 主要文件
- `diet.controller.ts` - 路由控制器
- `diet.service.ts` - 业务逻辑
- `diet.module.ts` - 模块定义

### 核心服务

#### 创建饮食记录
```typescript
async create(userId: string, data: CreateDietDto) {
  return this.prisma.diet.create({
    data: {
      userId,
      mealType: data.mealType,
      totalCalories: data.totalCalories,
      imageUrl: data.imageUrl,
      foodItems: {
        create: data.foodItems
      }
    },
    include: { foodItems: true }
  });
}
```

#### AI识别
```typescript
async recognize(imageUrl: string) {
  // 调用Gemini API识别食物
  const result = await this.geminiService.recognizeFood(imageUrl);
  return {
    foodItems: result.items,
    totalCalories: result.total,
    confidence: result.confidence
  };
}
```

## 数据库表

参考: [饮食相关表](../database/DIET_TABLES.md)

- `Diet` - 饮食记录主表
- `FoodItem` - 食物条目表

## 开发任务

### 前端任务
- [ ] 相机界面优化
- [ ] 图片裁剪功能
- [ ] 识别结果编辑界面
- [ ] 历史记录列表
- [ ] 营养统计图表

### 后端任务
- [ ] 图片上传服务
- [ ] AI识别接口
- [ ] 数据统计接口
- [ ] 缓存优化

## 测试要点

- 拍照流程完整性
- 图片上传成功率
- AI识别准确性
- 数据保存正确性
- 历史记录查询性能

## 参考文档

- [饮食API](../api/DIET.md)
- [设计系统](../ui/DESIGN_SYSTEM.md)
- [数据库表](../database/DIET_TABLES.md)
