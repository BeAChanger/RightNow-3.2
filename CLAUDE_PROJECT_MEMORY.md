# CLAUDE_PROJECT_MEMORY.md

> 本文件由 Claude Code (CC) 和 AntiGravity (AG) 共同维护，记录项目架构、技术栈、关键决策和协作规范。

---

## 📋 项目概览

**项目名称**: RightNow Fitness
**类型**: 健身管理平台 Monorepo
**架构**: 前后端分离 + RAG 知识库服务
**当前分支**: feat/rag-knowledge-base
**主分支**: main

---

## 🛠 技术栈

| 领域 | 技术 | 版本/说明 |
|------|------|----------|
| 前端用户端 | React + Vite + TypeScript | 端口 5173 |
| 前端管理端 | React + Vite + TypeScript | 端口 5174 |
| 后端 API | NestJS + Prisma + PostgreSQL | 端口 5000 |
| RAG 服务 | Python FastAPI | 端口 8000 |
| 数据库 | PostgreSQL (Docker) | 端口 15433 |
| 包管理 | npm workspaces | Monorepo 结构 |

---

## 🏗 架构设计

### 前端部分 (AG 负责)

- **用户端** (`frontend/`): 用户健身管理界面
  - AI 聊天、待办事项、进化引擎、数据看板
  - 使用 Gemini API 进行 AI 对话

- **管理端** (`admin/`): 后台管理系统
  - 用户管理、知识库管理、提示词中心、审计日志
  - 通过 Nest 代理访问 RAG 服务

### 后端部分 (CC 负责)

- **NestJS API** (`backend/`):
  - 模块化架构: auth, users, posts, todos, diet, evolution, friendships, ai-coach, upload
  - Prisma ORM + PostgreSQL
  - JWT 认证策略

- **RAG 服务** (`rag-service/`):
  - Python FastAPI 独立服务
  - 知识库向量检索
  - 通过后端代理访问

---

## 📝 最新更新记录

| 日期 | 负责方 | 类型 | 描述 |
|------|--------|------|------|
| 2026-03-06 | Codex | 文档 | 新增并登记 real-team-handover-docs-generator 技能（`/handvoer`，兼容 `/handover`） |
| 2026-03-05 | CC | 功能 | 增强 RAG 知识库服务 (commit 23b2de7) |
| 2026-03-05 | 双方 | 架构 | 合并 main 历史到架构基线 (commit 5211d32) |
| 2026-03-05 | 双方 | 配置 | 更新 gitignore 适配 monorepo 结构 |
| 2026-03-05 | 双方 | 规划 | 建立多人多 Agent 协作文档架构 |

---

## 🎯 规划待办 & 关键决策

### 待办事项
- [ ] 完成 RAG 知识库功能集成测试
- [ ] 管理端知识库模块前端开发
- [ ] 提示词中心 CRUD 功能实现
- [ ] 审计日志模块开发

### 关键决策
- ✅ 采用 Monorepo 架构管理多服务
- ✅ RAG 服务独立部署，通过 Nest 代理访问
- ✅ 使用 npm workspaces 统一依赖管理
- ✅ Docker Compose 管理 PostgreSQL

---

## 🚫 禁忌事项 & 偏好风格

### 禁忌 (Never Do)
- ❌ 不要直接修改 Prisma schema 后忘记运行 `npm run db:push`
- ❌ 不要在未启动 Docker 数据库的情况下启动后端
- ❌ 不要跳过 RAG 服务的 Python 依赖安装

### 偏好 (Always Do)
- ✅ 使用 `scripts/start-dev.ps1` 或 `start-dev.sh` 一键启动所有服务
- ✅ 代码提交前确保所有服务正常运行
- ✅ 新增 API 端点时同步更新文档
- ✅ 保持前后端类型定义一致

---

## 📚 重要文档索引

- 本地启动指南: `docs/existing/LOCAL_STARTUP_GUIDE.md`
- 系统架构: `docs/ARCHITECTURE.md`
- API 文档: `docs/api/`
- 数据库设计: `docs/database/`
- 模块说明: `docs/modules/`
- 工作流程: `docs/workflows/`

---

## 🔐 默认账号

- 用户演示: `demo@rightnow.fit` / `password123`
- 管理员: `admin@admin.com` / `123456`

---

**最后更新**: 2026-03-06
**维护者**: Claude Code (CC) + AntiGravity (AG)
