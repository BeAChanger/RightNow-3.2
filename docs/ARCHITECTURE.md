# 系统架构

## 技术栈

### 前端
- **框架**: React 19.2.4 + TypeScript 5.8.2
- **构建工具**: Vite 6.2.0
- **3D渲染**: Three.js + @react-three/fiber + @react-three/drei
- **图表**: Recharts 3.7.0
- **样式**: Tailwind CSS
- **状态管理**: React Hooks (useState, useEffect)

### 后端
- **框架**: NestJS
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **认证**: JWT

### AI服务
- **主模型**: Google Gemini
- **RAG服务**: 独立服务 (rag-service/)
- **向量数据库**: (待补充)

## Monorepo结构

```
/e/RightNow-Fitness/
├── frontend/           # React前端应用
│   ├── src/
│   │   ├── views/      # 页面组件
│   │   ├── components/ # 可复用组件
│   │   ├── types.ts    # 类型定义
│   │   └── App.tsx     # 主应用
│   └── public/         # 静态资源
│
├── backend/            # NestJS后端API
│   ├── src/
│   │   ├── auth/       # 认证模块
│   │   ├── diet/       # 饮食模块
│   │   ├── community/  # 社区模块
│   │   ├── ai-coach/   # AI教练模块
│   │   └── prisma/     # 数据库Schema
│   └── prisma/
│
├── rag-service/        # RAG服务
│   └── (待补充)
│
└── docs/               # 项目文档
```

## 模块划分

### 前端模块
- **启动流程**: Splash → Onboarding → Dashboard
- **核心功能**: Dashboard (3D模型) | DataDashboard | DietLog | WeightRecord
- **AI功能**: AIChat | EvolutionEngine | EvolutionRecord
- **社区功能**: Community | CheckIn系列
- **通用组件**: BottomNav | FloatingAdvisor | Hero3D

### 后端模块
- **auth**: 用户认证与授权
- **diet**: 饮食记录与识别
- **community**: 社区互动与打卡
- **ai-coach**: AI教练对话与计划生成
- **upload**: 文件上传服务
- **analytics**: 数据统计

## 数据流

### 用户请求流程
```
用户操作 → 前端组件 → API调用 → 后端Controller → Service层 → Prisma ORM → PostgreSQL
                                                    ↓
                                              AI服务 (Gemini/RAG)
```

### AI功能流程
```
用户输入 → AIChat组件 → /api/ai-coach → AI Coach Service → Gemini API
                                                          ↓
                                                    RAG Service (知识库)
```

### 饮食识别流程
```
拍照 → ActionCenter → 上传图片 → /api/diet/recognize → AI识别 → 保存记录
```

## 路由设计

### 前端路由
使用枚举 + useState 实现视图切换（非React Router）:
```typescript
enum View {
  Splash, Onboarding, Dashboard, AIChat, Community, ...
}
```

### 后端API路由
- `/api/auth/*` - 认证相关
- `/api/diet/*` - 饮食相关
- `/api/community/*` - 社区相关
- `/api/ai-coach/*` - AI教练相关
- `/api/analytics/*` - 数据统计

## 部署架构

### 开发环境
- 前端: `http://localhost:3000`
- 后端: `http://localhost:3100`
- 数据库: `localhost:5432`

### 生产环境
(待补充)

## 安全考虑

- JWT Token认证
- 图片上传大小限制
- API请求频率限制
- 敏感数据加密存储
- CORS配置

## 性能优化

- 前端代码分割 (Vite)
- 图片懒加载
- 3D模型按需加载
- API响应缓存
- 数据库索引优化
