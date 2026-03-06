# RightNow Fitness - 开发交接文档

**文档版本**: v1.0
**生成日期**: 2026-03-06
**项目状态**: 开发中（基准代码已完成，部分功能待优化）

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 系统架构](#2-系统架构)
- [3. 技术栈](#3-技术栈)
- [4. 代码库结构](#4-代码库结构)
- [5. 数据库设计](#5-数据库设计)
- [6. API接口规范](#6-api接口规范)
- [7. 本地开发环境搭建](#7-本地开发环境搭建)
- [8. 测试策略](#8-测试策略)
- [9. 已知问题与技术债](#9-已知问题与技术债)
- [10. 扩展开发指南](#10-扩展开发指南)
- [11. 交接验收清单](#11-交接验收清单)

---

## 1. 项目概览

### 1.1 业务目标

RightNow Fitness 是一款基于 AI 的智能健身应用，提供：
- **个性化健身计划**：根据用户体型、目标生成定制训练和饮食方案
- **AI 教练对话**：实时健身指导、动作纠正、营养建议
- **体型进化引擎**：AI 生成目标体型图片，可视化健身进度
- **社区互动**：打卡分享、好友系统、动态评论
- **数据追踪**：体重、饮食、训练记录的可视化分析

### 1.2 核心功能模块

| 模块 | 功能描述 | 开发状态 |
|------|---------|---------|
| 用户认证 | 注册/登录/JWT 鉴权 | ✅ 已完成 |
| 个人档案 | 体型数据、目标设定 | ✅ 已完成 |
| AI 教练 | 对话式健身指导 | ✅ 已完成 |
| 训练记录 | 训练日志、组次详情 | ✅ 已完成 |
| 饮食管理 | 饮食记录、拍照识别 | ⚠️ 存在 Bug |
| 体重追踪 | 体重/腰围/臀围记录 | ✅ 已完成 |
| 体型进化 | AI 生图、进度追踪 | ⚠️ Prompt 待优化 |
| 社区功能 | 动态发布、评论、点赞 | ⚠️ 测试未完成 |
| 好友系统 | 好友申请、关系管理 | ⚠️ 测试未完成 |
| RAG 知识库 | 健身知识检索增强 | ⚠️ 链路待优化 |

### 1.3 技术亮点

- **Monorepo 架构**：前后端统一管理，共享配置
- **3D 可视化**：Three.js 实现人体模型展示
- **AI 驱动**：Google Gemini + RAG 提供智能对话
- **实时反馈**：训练过程中的 AI 实时指导
- **渐进式 PWA**：支持移动端安装

---

## 2. 系统架构

### 2.1 整体架构图

```mermaid
graph TB
    subgraph "前端层"
        A[React + Vite<br/>端口: 5173]
        A1[3D 模型渲染<br/>Three.js]
        A2[状态管理<br/>React Hooks]
    end

    subgraph "后端层"
        B[NestJS API<br/>端口: 5000]
        B1[Auth Module<br/>JWT]
        B2[AI Coach Module]
        B3[Diet Module]
        B4[Community Module]
        B5[Training Module]
    end

    subgraph "数据层"
        C[PostgreSQL<br/>端口: 15433]
        C1[Prisma ORM]
    end

    subgraph "AI 服务层"
        D[RAG Service<br/>Python FastAPI<br/>端口: 8000]
        D1[ChromaDB<br/>向量数据库]
        E[Google Gemini API]
    end

    A --> B
    A1 --> A
    A2 --> A
    B --> C
    B1 --> B
    B2 --> B
    B2 --> D
    B2 --> E
    B3 --> B
    B4 --> B
    B5 --> B
    C1 --> C
    D --> D1
```

### 2.2 数据流向

#### 用户请求流程
```
用户操作 → 前端组件 → Axios 请求 → NestJS Controller
    → Service 层业务逻辑 → Prisma ORM → PostgreSQL
    → 返回数据 → 前端渲染
```

#### AI 对话流程
```
用户消息 → AIChat.tsx → POST /ai-coach/chat
    → AI Coach Service → RAG Service (知识检索)
    → Google Gemini API (生成回复)
    → 保存对话历史 → 返回 AI 回复
```

#### 饮食识别流程
```
拍照 → ActionCenter.tsx → 上传图片 → POST /upload
    → 获取图片 URL → POST /diet/recognize
    → Gemini Vision API → 识别食物信息
    → 保存饮食记录 → 返回结构化数据
```

---

## 3. 技术栈

### 3.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.4 | UI 框架 |
| TypeScript | 5.8.2 | 类型安全 |
| Vite | 6.2.0 | 构建工具 |
| Three.js | 0.182.0 | 3D 渲染 |
| @react-three/fiber | 9.5.0 | React Three.js 集成 |
| @react-three/drei | 10.7.7 | Three.js 辅助库 |
| Recharts | 3.7.0 | 数据图表 |
| Axios | 1.13.5 | HTTP 客户端 |
| Tailwind CSS | - | 样式框架 |

### 3.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | 10.4.15 | 后端框架 |
| Prisma | 6.4.1 | ORM |
| PostgreSQL | - | 关系数据库 |
| JWT | 10.2.0 | 身份认证 |
| Passport | 0.7.0 | 认证中间件 |
| Bcrypt | 5.1.1 | 密码加密 |
| Multer | 1.4.5 | 文件上传 |

### 3.3 AI 服务技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.x | RAG 服务语言 |
| FastAPI | - | API 框架 |
| ChromaDB | - | 向量数据库 |
| Google Gemini | - | LLM 模型 |
| Uvicorn | - | ASGI 服务器 |

### 3.4 开发工具

- **包管理器**: npm (Monorepo Workspaces)
- **容器化**: Docker Compose (PostgreSQL)
- **版本控制**: Git
- **代码规范**: TypeScript ESLint
- **API 测试**: (建议补充 Postman/Insomnia 配置)

---

## 4. 代码库结构

### 4.1 Monorepo 目录结构

```
RightNow-Fitness/
├── frontend/                 # React 前端应用
│   ├── views/               # 页面组件 (24 个视图)
│   │   ├── Splash.tsx       # 启动页
│   │   ├── Onboarding.tsx   # 引导页
│   │   ├── Dashboard.tsx    # 主页 (含 3D 模型)
│   │   ├── AIChat.tsx       # AI 对话
│   │   ├── DietLog.tsx      # 饮食记录
│   │   ├── Community.tsx    # 社区动态
│   │   ├── EvolutionEngine.tsx  # 体型进化
│   │   └── ...
│   ├── components/          # 可复用组件
│   │   ├── BottomNav.tsx    # 底部导航
│   │   ├── FloatingAdvisor.tsx  # 悬浮 AI 按钮
│   │   └── Hero3D.tsx       # 3D 模型查看器
│   ├── api/                 # API 客户端
│   │   ├── client.ts        # Axios 实例
│   │   ├── index.ts         # API 方法汇总
│   │   └── training.ts      # 训练相关 API
│   ├── services/            # 业务服务
│   │   └── gemini.ts        # Gemini API 封装
│   ├── types.ts             # TypeScript 类型定义
│   ├── App.tsx              # 主应用组件
│   ├── index.tsx            # React 入口
│   ├── vite.config.ts       # Vite 配置
│   └── package.json
│
├── backend/                 # NestJS 后端 API
│   ├── src/
│   │   ├── auth/            # 认证模块
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/jwt.strategy.ts
│   │   │   └── guards/      # 守卫 (新增)
│   │   ├── users/           # 用户模块
│   │   ├── ai-coach/        # AI 教练模块
│   │   ├── diet/            # 饮食模块
│   │   │   ├── diet.controller.ts  # (新增)
│   │   │   ├── diet.service.ts     # (新增)
│   │   │   └── diet-cleanup.service.ts
│   │   ├── training/        # 训练模块
│   │   ├── training-session/  # 训练会话 (新增)
│   │   ├── evolution/       # 体型进化模块
│   │   ├── evolution-stage/ # 进化阶段 (新增)
│   │   ├── posts/           # 社区动态
│   │   │   ├── posts.controller.ts  # (新增)
│   │   │   └── posts.service.ts     # (新增)
│   │   ├── friendships/     # 好友系统
│   │   ├── chat/            # 聊天模块
│   │   ├── upload/          # 文件上传
│   │   │   └── upload.service.ts  # (新增)
│   │   ├── prompts/         # AI Prompt 模板 (新增)
│   │   ├── prisma/          # Prisma 服务
│   │   ├── common/          # 公共模块
│   │   │   └── decorators/  # 装饰器
│   │   ├── app.module.ts    # 根模块
│   │   └── main.ts          # 应用入口
│   ├── prisma/
│   │   ├── schema.prisma    # 数据库 Schema
│   │   └── seed.ts          # 种子数据
│   ├── .env.example         # 环境变量示例
│   ├── docker-compose.yml   # PostgreSQL 容器
│   └── package.json
│
├── rag-service/             # RAG 知识库服务
│   ├── api/                 # API 路由
│   ├── services/            # 业务服务
│   ├── scripts/             # 脚本工具
│   ├── chroma_db/           # ChromaDB 数据目录
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置文件
│   ├── requirements.txt     # Python 依赖
│   └── README.md
│
├── docs/                    # 项目文档
│   ├── ARCHITECTURE.md      # 架构文档
│   ├── architecture/        # 功能架构计划
│   ├── existing/            # 历史文档
│   └── README.md
│
├── handover/                # 交接文档 (本文档)
│   ├── DEV_HANDOVER.md      # 开发交接文档
│   └── OPS_RUNBOOK.md       # 运维手册
│
├── scripts/                 # 启动脚本
│   ├── start-dev.sh         # Linux/Mac 启动脚本
│   └── start-dev.ps1        # Windows 启动脚本
│
├── package.json             # Monorepo 根配置
└── README.md                # 项目说明
```

### 4.2 关键文件说明

#### 前端关键文件

| 文件路径 | 作用 | 重要程度 |
|---------|------|---------|
| `frontend/App.tsx` | 主应用组件，路由控制、全局状态 | ⭐⭐⭐⭐⭐ |
| `frontend/types.ts` | 全局类型定义 | ⭐⭐⭐⭐⭐ |
| `frontend/api/client.ts` | Axios 实例配置、拦截器 | ⭐⭐⭐⭐⭐ |
| `frontend/views/AIChat.tsx` | AI 对话核心逻辑 | ⭐⭐⭐⭐⭐ |
| `frontend/views/Dashboard.tsx` | 主页 3D 模型展示 | ⭐⭐⭐⭐ |
| `frontend/components/Hero3D.tsx` | 3D 模型渲染组件 | ⭐⭐⭐⭐ |
| `frontend/vite.config.ts` | Vite 构建配置 | ⭐⭐⭐ |

#### 后端关键文件

| 文件路径 | 作用 | 重要程度 |
|---------|------|---------|
| `backend/src/main.ts` | NestJS 应用入口、CORS 配置 | ⭐⭐⭐⭐⭐ |
| `backend/src/app.module.ts` | 根模块、依赖注入配置 | ⭐⭐⭐⭐⭐ |
| `backend/prisma/schema.prisma` | 数据库 Schema 定义 | ⭐⭐⭐⭐⭐ |
| `backend/src/auth/auth.service.ts` | 认证逻辑、JWT 生成 | ⭐⭐⭐⭐⭐ |
| `backend/src/ai-coach/ai-coach.module.ts` | AI 教练模块 (33KB 大文件) | ⭐⭐⭐⭐⭐ |
| `backend/src/ai/ai.service.ts` | AI 服务封装 | ⭐⭐⭐⭐ |
| `backend/src/prisma/prisma.service.ts` | Prisma 客户端配置 | ⭐⭐⭐⭐ |

#### RAG 服务关键文件

| 文件路径 | 作用 | 重要程度 |
|---------|------|---------|
| `rag-service/main.py` | FastAPI 应用入口 | ⭐⭐⭐⭐⭐ |
| `rag-service/config.py` | 配置管理 | ⭐⭐⭐⭐ |
| `rag-service/services/` | RAG 核心服务 | ⭐⭐⭐⭐ |

---


## 5. 数据库设计

### 5.1 ER 图

```mermaid
erDiagram
    User ||--o{ WeightRecord : has
    User ||--o{ DietRecord : has
    User ||--o{ TrainingRecord : has
    User ||--o{ Todo : has
    User ||--o{ Post : creates
    User ||--o{ Comment : writes
    User ||--o{ EvolutionRecord : has
    User ||--o{ TrainingSession : has
    User ||--o| AiCoachProfile : has
    User ||--o{ Friendship : requests

    TrainingRecord ||--o{ TrainingSetDetail : contains
    TrainingRecord ||--o| TrainingSession : belongs_to
    Post ||--o{ Comment : has
    EvolutionRecord ||--o{ EvolutionAssessment : has

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        float weight
        float goalWeight
    }
```

### 5.2 核心数据表

#### User (用户表)
- `id`: CUID 主键
- `email`: 唯一邮箱
- `passwordHash`: Bcrypt 加密密码
- `weight`: 当前体重 (kg)
- `goalWeight`: 目标体重 (kg)
- `isProfileComplete`: 档案是否完整

#### TrainingRecord (训练记录表)
- `id`: CUID 主键
- `userId`: 用户 ID (外键)
- `description`: 训练描述
- `duration`: 时长 (分钟)
- `date`: 训练日期 (YYYY-MM-DD)
- `structuredData`: 结构化数据 (JSON)
- 索引: `(userId, date)`, `(userId, targetMuscle, date)`

#### DietRecord (饮食记录表)
- `id`: CUID 主键
- `userId`: 用户 ID (外键)
- `name`: 食物名称
- `calories`: 卡路里
- `protein`: 蛋白质 (g)
- `date`: 日期 (YYYY-MM-DD)
- 索引: `(userId, date)`

#### Post (社区动态表)
- `id`: CUID 主键
- `userId`: 用户 ID (外键)
- `content`: 动态内容
- `images`: 图片 URL 数组
- `likedUserIds`: 点赞用户 ID 数组
- 索引: `(userId, createdAt)`

### 5.3 数据库操作命令

```bash
# 启动 PostgreSQL 容器
npm run db:up

# 停止容器
npm run db:down

# 推送 Schema 到数据库
npm run db:push

# 运行种子数据
npm run db:seed

# 初始化数据库 (push + seed)
npm run db:init
```

---

## 6. API 接口规范

### 6.1 认证接口

#### POST /api/auth/register
注册新用户

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "张三"
}
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "张三"
  }
}
```

#### POST /api/auth/login
用户登录 (请求体同注册)

### 6.2 AI 教练接口

#### POST /api/ai-coach/chat
AI 对话

**请求头**: `Authorization: Bearer <token>`

**请求体**:
```json
{
  "message": "今天应该练什么？"
}
```

**响应**:
```json
{
  "reply": "根据你的训练计划，今天是胸部训练日...",
  "context": {}
}
```

### 6.3 训练接口

#### POST /api/training
创建训练记录

**请求体**:
```json
{
  "description": "卧推 4组x10次",
  "duration": 60,
  "date": "2026-03-06",
  "targetMuscle": "chest"
}
```

#### GET /api/training?date=2026-03-06
获取训练记录

### 6.4 饮食接口

#### POST /api/diet/recognize
识别食物 (需要 imageUrl)

#### POST /api/diet
创建饮食记录

### 6.5 社区接口

#### GET /api/posts
获取动态列表 (支持分页)

#### POST /api/posts
发布动态

### 6.6 文件上传接口

#### POST /api/upload
上传文件 (multipart/form-data)

---

## 7. 本地开发环境搭建

### 7.1 前置要求

- Node.js >= 18.x
- npm >= 9.x
- Docker >= 20.x (PostgreSQL)
- Python >= 3.9 (RAG 服务)
- Git

### 7.2 快速启动

```bash
# 1. 克隆仓库
git clone <repository-url>
cd RightNow-Fitness

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库和 JWT 密钥

# 4. 启动 PostgreSQL
npm run db:up

# 5. 初始化数据库
npm run db:init

# 6. 启动后端 (新终端)
npm run dev:backend

# 7. 启动前端 (新终端)
npm run dev:frontend

# 8. (可选) 启动 RAG 服务
cd rag-service
pip install -r requirements.txt
cd ..
npm run dev:rag
```

### 7.3 验证安装

- 前端: http://localhost:5173
- 后端: http://localhost:5000
- RAG 服务: http://localhost:8000/docs

测试账号: `admin@admin.com` / `123456`

---

## 8. 测试策略

### 8.1 当前测试状态

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 状态 |
|------|---------|---------|---------|------|
| 认证模块 | ❌ | ❌ | ❌ | 未实施 |
| AI 教练 | ❌ | ❌ | ❌ | 未实施 |
| 训练记录 | ❌ | ❌ | ❌ | 未实施 |
| 饮食管理 | ❌ | ❌ | ❌ | 未实施 |
| 社区功能 | ❌ | ❌ | ❌ | **待测试** |
| 好友系统 | ❌ | ❌ | ❌ | **待测试** |

### 8.2 建议测试框架

**后端测试**:
```bash
# 安装 Jest
npm --workspace backend install --save-dev @nestjs/testing jest

# 测试命令
npm --workspace backend run test
npm --workspace backend run test:e2e
```

**前端测试**:
```bash
# 安装 Vitest + React Testing Library
npm --workspace frontend install --save-dev vitest @testing-library/react

# 测试命令
npm --workspace frontend run test
```

### 8.3 关键测试场景

**必测场景**:
1. 用户注册/登录流程
2. AI 对话响应正确性
3. 训练记录 CRUD
4. 饮食识别准确性
5. 社区动态发布/评论/点赞
6. 好友申请/接受/拒绝
7. 文件上传安全性

---

## 9. 已知问题与技术债

### 9.1 高优先级问题 (P0)

#### 🔴 问题 1: 饮食模块存在 Bug
**描述**: 饮食记录功能存在未调试的 Bug
**影响**: 用户无法正常记录饮食数据
**位置**: 
- `backend/src/diet/diet.service.ts`
- `frontend/views/DietLog.tsx`
**建议修复**:
1. 检查 API 响应格式是否一致
2. 验证 Gemini Vision API 调用逻辑
3. 添加错误处理和重试机制

#### 🔴 问题 2: 社区功能未完成测试
**描述**: 社区动态、评论、点赞功能未经过完整测试
**影响**: 可能存在数据一致性问题
**位置**:
- `backend/src/posts/posts.service.ts`
- `frontend/views/Community.tsx`
**建议测试**:
1. 动态发布后是否正确显示
2. 评论嵌套层级是否正确
3. 点赞状态同步是否准确
4. 分页加载是否正常

#### 🔴 问题 3: 好友系统未完成测试
**描述**: 好友申请、接受、拒绝流程未测试
**影响**: 可能导致好友关系状态错误
**位置**:
- `backend/src/friendships/friendships.service.ts`
- `frontend/views/Community.tsx` (好友列表部分)
**建议测试**:
1. 好友申请发送/接收
2. 重复申请处理
3. 好友删除逻辑
4. 好友列表查询性能

### 9.2 中优先级问题 (P1)

#### 🟡 问题 4: AI 生图 Prompt 待优化
**描述**: 体型进化生图的 Prompt 质量不稳定
**影响**: 生成图片质量不一致
**位置**:
- `backend/src/prompts/` (Prompt 模板目录)
- `backend/src/evolution/evolution.service.ts`
**优化方向**:
1. 增加更详细的体型描述
2. 添加风格一致性约束
3. 优化负面 Prompt
4. 添加质量控制参数

#### 🟡 问题 5: AI 后端链路待优化
**描述**: AI 教练与 RAG 服务的集成链路需要优化
**影响**: 响应速度慢，知识检索不准确
**位置**:
- `backend/src/ai-coach/ai-coach.module.ts` (33KB 大文件)
- `rag-service/main.py`
**优化方向**:
1. 实现请求缓存机制
2. 优化 RAG 检索算法
3. 添加流式响应支持
4. 减少 AI Coach Module 文件大小 (拆分服务)

### 9.3 技术债清单

| 技术债 | 优先级 | 预计工作量 | 负责模块 |
|--------|--------|-----------|---------|
| 缺少单元测试 | P0 | 2 周 | 全部模块 |
| 缺少 API 文档 (Swagger) | P1 | 3 天 | 后端 |
| 前端缺少错误边界 | P1 | 2 天 | 前端 |
| 缺少日志系统 | P1 | 3 天 | 后端 |
| 缺少性能监控 | P2 | 1 周 | 全栈 |
| 3D 模型加载优化 | P2 | 3 天 | 前端 |
| 数据库查询优化 | P2 | 1 周 | 后端 |
| 图片压缩和 CDN | P2 | 3 天 | 后端/运维 |

### 9.4 安全隐患

⚠️ **需要立即处理**:
1. JWT Secret 使用默认值 (生产环境必须更换)
2. 文件上传缺少类型和大小验证
3. API 缺少请求频率限制
4. 敏感信息可能泄露在日志中

---

## 10. 扩展开发指南

### 10.1 添加新的 API 端点

**后端步骤**:
```bash
# 1. 生成新模块
cd backend
npx nest g module feature-name
npx nest g controller feature-name
npx nest g service feature-name

# 2. 在 app.module.ts 中注册模块
# 3. 实现 Controller 和 Service
# 4. 添加 DTO 验证
```

**前端步骤**:
```typescript
// 1. 在 frontend/api/ 添加 API 方法
export const getFeature = () => client.get('/api/feature-name');

// 2. 在组件中调用
const data = await getFeature();
```

### 10.2 添加新的数据表

```bash
# 1. 编辑 backend/prisma/schema.prisma
model NewTable {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

# 2. 推送到数据库
npm run db:push

# 3. 生成 Prisma Client
cd backend && npm run prisma:generate
```

### 10.3 添加新的前端页面

```typescript
// 1. 在 frontend/views/ 创建组件
// NewView.tsx
export const NewView: React.FC<Props> = ({ onBack }) => {
  return <div>New View</div>;
};

// 2. 在 App.tsx 添加枚举
enum View {
  // ...
  NewView,
}

// 3. 在 App.tsx 添加路由
{currentView === View.NewView && <NewView onBack={...} />}
```

### 10.4 集成新的 AI 功能

```typescript
// 1. 在 backend/src/ai/ai.service.ts 添加方法
async generateResponse(prompt: string) {
  const response = await this.geminiClient.generate(prompt);
  return response;
}

// 2. 在 Controller 中调用
@Post('generate')
async generate(@Body() dto: GenerateDto) {
  return this.aiService.generateResponse(dto.prompt);
}
```

### 10.5 编码规范

**TypeScript**:
- 使用 `interface` 定义 Props
- 使用 `type` 定义联合类型
- 函数命名: `camelCase`
- 组件命名: `PascalCase`
- 常量命名: `UPPER_SNAKE_CASE`

**React**:
- 使用函数组件 + Hooks
- Props 解构传递
- 事件处理函数以 `handle` 开头
- 避免内联函数 (性能优化)

**NestJS**:
- 使用 DTO 验证请求
- 使用 Guards 保护路由
- 使用 Interceptors 处理响应
- 使用 Pipes 转换数据

---

## 11. 交接验收清单

### 11.1 环境搭建验收

- [ ] Node.js 和 npm 版本正确
- [ ] Docker 正常运行
- [ ] PostgreSQL 容器启动成功
- [ ] 数据库初始化完成 (种子数据已导入)
- [ ] 后端服务启动成功 (端口 5000)
- [ ] 前端服务启动成功 (端口 5173)
- [ ] RAG 服务启动成功 (端口 8000)
- [ ] 测试账号可以正常登录

### 11.2 功能验收

**核心功能**:
- [ ] 用户注册/登录正常
- [ ] 个人档案填写完整
- [ ] AI 教练对话响应正常
- [ ] 训练记录创建/查询正常
- [ ] 体重记录创建/查询正常
- [ ] 3D 模型正常显示
- [ ] 数据看板图表正常显示

**待修复功能**:
- [ ] 饮食记录功能已修复并测试
- [ ] 社区动态发布/评论/点赞已测试
- [ ] 好友申请/接受/拒绝已测试
- [ ] AI 生图 Prompt 已优化
- [ ] RAG 知识库检索已优化

### 11.3 代码理解验收

- [ ] 理解 Monorepo 结构
- [ ] 理解前端路由机制 (枚举 + useState)
- [ ] 理解后端模块划分
- [ ] 理解 Prisma Schema 设计
- [ ] 理解 JWT 认证流程
- [ ] 理解 AI 对话流程
- [ ] 理解文件上传流程

### 11.4 文档验收

- [ ] 阅读完本交接文档
- [ ] 阅读 `docs/ARCHITECTURE.md`
- [ ] 阅读 `frontend/CLAUDE.md`
- [ ] 阅读 `backend/README.md` (如有)
- [ ] 阅读 `rag-service/README.md`

### 11.5 开发工具验收

- [ ] Git 仓库克隆成功
- [ ] IDE 配置完成 (推荐 VS Code)
- [ ] 代码格式化工具配置 (Prettier/ESLint)
- [ ] 数据库客户端配置 (推荐 DBeaver/TablePlus)
- [ ] API 测试工具配置 (推荐 Postman/Insomnia)

### 11.6 问题排查验收

- [ ] 知道如何查看后端日志
- [ ] 知道如何查看数据库日志
- [ ] 知道如何重启服务
- [ ] 知道如何重置数据库
- [ ] 知道如何调试前端代码
- [ ] 知道如何调试后端代码

---

## 附录

### A. 常用命令速查

```bash
# 数据库
npm run db:up          # 启动 PostgreSQL
npm run db:down        # 停止 PostgreSQL
npm run db:init        # 初始化数据库
npm run db:push        # 推送 Schema
npm run db:seed        # 运行种子数据

# 开发
npm run dev:frontend   # 启动前端
npm run dev:backend    # 启动后端
npm run dev:rag        # 启动 RAG 服务

# 构建
npm run build:frontend # 构建前端
npm run build:backend  # 构建后端

# 安装
npm install            # 安装所有依赖
npm --workspace frontend install  # 安装前端依赖
npm --workspace backend install   # 安装后端依赖
```

### B. 端口占用

| 服务 | 端口 | 用途 |
|------|------|------|
| 前端 | 5173 | React 开发服务器 |
| 后端 | 5000 | NestJS API |
| RAG 服务 | 8000 | Python FastAPI |
| PostgreSQL | 15433 | 数据库 |

### C. 环境变量清单

**后端 (backend/.env)**:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:15433/rightnow_fitness?schema=public
JWT_SECRET=your-secret-key
PORT=5000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
RAG_SERVICE_URL=http://localhost:8000
```

**前端 (frontend/.env.local)**:
```
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### D. 联系方式

- **技术负责人**: [待填写]
- **项目经理**: [待填写]
- **紧急联系**: [待填写]

---

**文档已优化为真人团队交接使用，可直接打印/分享**

**PDF 导出建议**: 使用 Markdown 转 PDF 工具 (如 Pandoc, Typora, VS Code Markdown PDF 插件)

**验收签字模板**:
```
交接方签字: ________________  日期: ________
接收方签字: ________________  日期: ________
```

