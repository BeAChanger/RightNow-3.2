# 社区模块

## 功能概述

用户可以发布动态、打卡记录，与其他用户互动（点赞、评论）。

## 前端实现

### 主要文件
- `frontend/src/views/Community.tsx` - 社区主页面
- `frontend/src/views/CheckInType.tsx` - 打卡类型选择
- `frontend/src/views/CheckInBody.tsx` - 身体打卡
- `frontend/src/views/CheckInSuccess.tsx` - 打卡成功
- `frontend/src/views/CheckInShare.tsx` - 打卡分享

### 核心功能
1. **动态列表**: 瀑布流展示用户动态
2. **发布动态**: 文字+图片发布
3. **打卡功能**: 身体/运动/饮食打卡
4. **互动功能**: 点赞、评论
5. **个人主页**: 查看个人动态

### 状态管理
```tsx
const [posts, setPosts] = useState<Post[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [page, setPage] = useState(1);
```

### API调用
```tsx
// 获取动态列表
const response = await fetch(`http://localhost:3100/api/community/posts?page=${page}&limit=20`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 点赞
await fetch(`http://localhost:3100/api/community/posts/${postId}/like`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 后端实现

### 模块位置
`backend/src/community/`

### 主要文件
- `community.controller.ts` - 路由控制器
- `community.service.ts` - 业务逻辑
- `community.module.ts` - 模块定义

### 核心服务

#### 获取动态列表
```typescript
async getPosts(page: number, limit: number, userId?: string) {
  const posts = await this.prisma.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: { select: { id: true, nickname: true, avatar: true } },
      _count: { select: { likes: true, comments: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 标记当前用户是否已点赞
  if (userId) {
    // 查询点赞状态
  }

  return posts;
}
```

#### 创建动态
```typescript
async createPost(userId: string, data: CreatePostDto) {
  return this.prisma.post.create({
    data: {
      userId,
      content: data.content,
      images: data.images,
      type: data.type
    }
  });
}
```

## 数据库表

参考: [社区相关表](../database/COMMUNITY_TABLES.md)

- `Post` - 动态表
- `Comment` - 评论表
- `Like` - 点赞表
- `CheckIn` - 打卡表

## 开发任务

### 前端任务
- [ ] 动态列表无限滚动
- [ ] 发布动态界面
- [ ] 图片预览功能
- [ ] 评论列表
- [ ] 打卡流程优化

### 后端任务
- [ ] 动态分页接口
- [ ] 点赞/取消点赞
- [ ] 评论接口
- [ ] 打卡统计
- [ ] 推荐算法

## 测试要点

- 动态列表加载性能
- 图片上传成功率
- 点赞状态同步
- 评论实时更新
- 打卡数据准确性

## 参考文档

- [社区API](../api/COMMUNITY.md)
- [设计系统](../ui/DESIGN_SYSTEM.md)
- [数据库表](../database/COMMUNITY_TABLES.md)
