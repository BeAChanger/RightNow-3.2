# PROJECT_REPORT.md

**项目名称**：RightNow Fitness — AI 驱动的健身显化平台
**最后更新**：2026-06-17
**当前状态**：进行中（阶段1已完成）

## 1. 项目一句话目标

基于"宇宙吸引力法则"，通过 AI 帮用户看见未来理想身材，再拆解为每日可执行路径，解决健身坚持难的问题。

## 2. 核心功能清单（按优先级）

1. **AI 共创理想身材** — 图像生成模型 + 迭代微调（最核心差异化）
2. **AI 教练** — Gemini + 健身知识库，个性化方案（三餐/喝水/训练）
3. **进化路径可视化** — 从现状到理想的阶段性展示
4. **饮食记录** — 拍照识别卡路里（Gemini 多模态）
5. **数据追踪** — 体重/饮食/训练/打卡全数据面板
6. **社区 + A2A** — AI 自动分享进步 + 健身搭子匹配

## 3. 典型用户旅程

```
注册/登录
  → 引导：基础信息（性别/身高/体重/年龄）
  → 上传当前身材照
  → 选择模板理想体型（男3/女3）或上传自定义
  → AI 出图：生成理想身材（后台异步）
  → AI 第二轮对话：收集运动基础/饮食习惯/作息/职业
  → AI 生成个性化方案（三餐 + 喝水 + 训练计划）
  → 进化路径可视化
  → 日常：饮食记录（拍照识别）、体重、训练打卡、AI 教练
  → 数据面板：全数据可视化
  → 社区：发帖互动 + AI 自动分享 + 搭子匹配
```

## 4. 技术架构简图

```
┌─────────────────────────────────────────────┐
│  Frontend (React 19 + TypeScript + Vite)    │
│  Tailwind CSS · Three.js · Recharts         │
│  Port: 5173                                 │
└──────────────────┬──────────────────────────┘
                   │ Vite Proxy /api/*
┌──────────────────▼──────────────────────────┐
│  Backend (NestJS + Prisma)                  │
│  14 Modules: Auth, Users, Weight, Diet,     │
│  Training, Todos, Checkins, Evolution,      │
│  Posts, Friendships, Chat, Upload,          │
│  ImageGen, FitnessPlan                      │
│  Port: 3000                                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  PostgreSQL 16 (Docker)  Port: 15433        │
└─────────────────────────────────────────────┘

外部服务：
  - Google Gemini API（AI 教练 + 食物识别）
  - 图像生成模型（理想身材出图）
```

## 5. Agent 角色分工

| 角色 | 负责人 | 职责 |
|------|--------|------|
| 项目总监 | 用户 | 决策、验收、种子用户沟通 |
| 全栈工程师 | Claude | 前后端代码实现 |
| AI集成工程师 | Claude | Gemini、图像生成、知识库 |
| 部署工程师 | Claude + 用户 | Docker、服务器、域名 |
| QA/文档 | Claude | 测试、报告、交接文档 |

## 6. Roadmap 进度

- [x] 阶段1 - 基础设施 & 认证（3月1日）✅
- [x] 阶段2 - 引导流程 & AI 共创理想身材（3月1日）✅
- [ ] 阶段3 - AI 教练 & 饮食追踪（3月4日）
- [ ] 阶段4 - 数据面板 & 日常追踪（3月5日）
- [ ] 阶段5 - 社区 & A2A（3月5-6日）
- [ ] 阶段6 - 部署 & 打磨（3月6-7日）

## 7. 已完成 & 用户验证记录

### 阶段1（3月1日）✅
- PostgreSQL Docker 容器运行正常（端口 15433）
- Prisma schema 同步，12 个数据模型创建完成
- Seed 数据：Demo User + Gym Buddy + 示例帖子 + 好友关系
- NestJS 后端 12 模块全部加载，端口 3000
- API 验证通过：注册、登录、JWT、onboarding

### 阶段2（3月1日）✅
- 新增 ImageGenTask + FitnessPlan 数据模型，Prisma 同步完成
- 后端新增 ImageGen + FitnessPlan 模块（共 14 模块）
- 前端 Gemini AI 服务：文本对话、多模态图片分析、方案生成
- EvolutionEngine 完全重写：
  - Gemini API 真实对话（替换 stub）
  - 4 步引导式信息收集 + 快捷回复按钮
  - AI 生成个性化健身方案并保存到后端
  - 自由聊天模式支持理想身材微调
- 前端 TypeScript 类型检查全部通过
- 待用户验证：启动前端体验 EvolutionEngine 新流程

## 8. 当前阻塞 & 待决策事项

- **待决策**：图像生成模型具体选型和 API 接入方式（用户提到的模型需确认）
- **待决策**：AI 第二轮对话的具体问题列表需共创
- **无阻塞**：基础设施全部就绪

## 9. 给后续开发者/其他 AI 的快速接手说明

### 启动项目
```bash
# 1. 启动数据库（如未运行）
cd rightnow-api && docker compose up -d

# 2. 初始化数据库
npx prisma db push && npx prisma db seed

# 3. 启动后端
npm run start:dev    # 端口 3000

# 4. 启动前端（项目根目录）
cd .. && npm run dev  # 端口 5173
```

### 关键文件
- `App.tsx` — 主路由和全局状态
- `types.ts` — View 枚举和类型定义
- `api/` — 前端 API 客户端层
- `views/` — 19 个页面组件
- `rightnow-api/` — NestJS 后端
- `rightnow-api/prisma/schema.prisma` — 数据库模型

### 认证机制
- JWT token 存储在 localStorage（key: `rightnow_token`）
- 前端 Axios 拦截器自动附加 Bearer token
- Demo 账号：demo@rightnow.fit / password123

## 10. AI Coach Architecture Sync (2026-03-02)

- `AI_COACH_ARCHITECTURE.md` has been created and now serves as the implementation contract for the AI Coach module.
- Codex execution scope for the current round: `public/knowledge/*`, `api/ai-coach.ts`, `api/index.ts`, `services/gemini.ts`, and backend `ai-coach` module / Prisma groundwork.
- Antigravity execution scope for the current round: `views/AIChat.tsx`, `components/coach/*`, `components/FloatingAdvisor.tsx`, and `App.tsx` coach trigger wiring.
- Current delivery order: knowledge base first, then frontend API and Gemini support, then backend module and schema, then integration.

## 11. AI Coach Progress Snapshot (2026-03-02)

- Completed: `public/knowledge/*` phase-1 files, `api/ai-coach.ts`, `api/index.ts`, `services/gemini.ts` coach helpers, `rightnow-api/src/ai-coach/ai-coach.module.ts`, `rightnow-api/src/app.module.ts`, and Vite proxy route registration.
- Completed: dedicated Prisma models were added in `rightnow-api/prisma/schema.prisma` and the backend `ai-coach` module now reads and writes `AiCoachAssessment`, `AiCoachCalibration`, `AiCoachIntake`, and `AiCoachProgress`.
- Completed: the local PostgreSQL schema has been synced with `prisma db push`.
- Note: Prisma's Windows engine file-lock issue was caused by the old running API process; after restarting that process, normal `prisma generate` works again.
- Completed: runtime smoke verification on `http://localhost:3000` is now passing after restarting the API; login + `assessment` + `progress` + `intake` + `first-plan` work, and the 1-2 day intake hard-reject returns `400` as expected.

## 12. AI Coach Backend Iteration 2 (2026-03-02)

- Backend-only iteration completed without touching UI files or frontend styles.
- Added profile persistence models and history snapshots: `AiCoachProfile` + `AiCoachProfileSnapshot`, plus `AiCoachIntake.extraAnswers` for future form data collection.
- Implemented profile generation pipeline in `ai-coach` module: aggregate assessment + intake -> generate personalized training plan, hydration plan, meal recommendation, and summary text.
- Added profile APIs: `GET /api/ai-coach/profile` and `POST /api/ai-coach/profile/refresh`.
- Added scheduled profile refresh (every 6 hours) to keep user archives and recommendations updated.
- Runtime smoke test passed for login + assessment + intake + profile + profile refresh; profile version increments correctly and 1-2 day frequency still hard-rejected with `400`.

## 13. Intake Re-entry Bug Fix (2026-03-02)

- Fixed AI coach intake completion flow in `views/AIChat.tsx` without changing UI styles.
- Root cause: the final `finally` branch used stale React state (`sending`) and could still show "first-day-plan" UI after intake save failure.
- Fix: use a local `saved` success flag; only show first-day-plan when both intake save and first-plan save succeed.
- Result: when backend rejects intake (for example 1-2 training days), UI now correctly re-prompts intake frequency instead of showing a fake completed plan.

## 14. RightNow x OpenClaw Agent Strategy (2026-06-17)

- Completed local architecture research using `openclawbook-md/`, `openclaw源码/`, and current RightNow modules.
- Added workspace-level strategy document: `RIGHTNOW_OPENCLAW_AGENT_STRATEGY.md`.
- Product direction: keep RightNow App as dashboard/control plane, add a safe allowlisted Agent API, then support two usage paths:
  - Existing-agent users: `RightNow Skill + CLI` for OpenClaw, Claude Code, Codex, or custom agents.
  - No-agent users: official RightNow Agent Host with OpenClaw-inspired Gateway, Channel, Cron, and Heartbeat behavior.
- Recommended MVP order: implement `/api/agent/rpc`, scoped token/device binding, `rightnow-cli`, and `skills/rightnow/SKILL.md` before building a full IM agent host.
- First proactive rule proposal: if the user has no training, check-in, or interaction for 3 days, send their latest ideal-self image with a short 15-minute action plan, respecting quiet hours and daily frequency limits.
- No production code, server deployment, or GitHub sync was performed in this research pass.
