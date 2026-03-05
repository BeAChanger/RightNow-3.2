# 数据看板模块

## 功能概述

展示用户的健身数据统计和进度分析。

## 前端实现

### 主要文件
- `frontend/src/views/DataDashboard.tsx` - 数据看板主页面

### 核心功能
1. **体重趋势**: 折线图展示体重变化
2. **饮食统计**: 卡路里摄入统计
3. **训练记录**: 训练完成情况
4. **目标进度**: 目标达成进度

### 图表库
使用Recharts 3.7.0

```tsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';

<LineChart data={weightData}>
  <Line type="monotone" dataKey="weight" stroke="#B8FF00" />
  <XAxis dataKey="date" />
  <YAxis />
</LineChart>
```

## 后端实现

### 统计接口
```typescript
async getStats(userId: string, startDate: Date, endDate: Date) {
  // 体重统计
  // 饮食统计
  // 训练统计
}
```

## 参考文档

- [数据统计API](../api/)
