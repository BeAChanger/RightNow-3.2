# RightNow × OpenClaw 翻新蓝图

> 版本：v1.0  
> 日期：2026-07-01  
> 状态：规划完成，待施工  
> 目标服务器：103.236.94.79 (root)  
> 目标项目：/root/rightnow/  
> OpenClaw 源码：/root/rightnow/openclaw/  
> 本地 OpenClaw：D:/openclaw2/openclaw/  
> FitClaw 参考：D:/openclaw2/fitclaw-package/

---

## 0. 背景

### 0.1 RightNow 是什么

RightNow 是一个 AI 驱动的健身教练 SaaS 平台。用户记录饮食/训练/体重，AI 教练根据知识库 + 个人数据给出建议。支持 Web 网页、飞书、微信三个交互通道。

### 0.2 当前痛点

1. **AI 对话能力分裂且弱**：Web/微信聊天走 `ChatService`（纯文本 LLM，无工具调用），飞书聊天走独立"小爪" Express 进程（手写 agent loop，21 个工具但架构脆弱）。三条路径三天体验。
2. **Agent 引擎自研维护成本高**：手写 function-calling loop（~120 行 JS），容错靠硬编码补丁（StepFun `tool_calls.function.arguments is required` 手动补 `"{}"`）。
3. **无记忆系统**：每次对话 agent 是"失忆症患者"，用户偏好不持久化，人设靠手写 Markdown 文件。
4. **前端评估流程有死代码**：AssessmentCard 从未接入状态机，深度评估 21 题太冗长。

### 0.3 翻新目标

把 RightNow 的 AI 大脑从"自研小引擎"换成 **OpenClaw**——统一对话引擎 + 完整记忆系统 + 运维级可配模型。具体：

- **OpenClaw 作为 AI 中枢**，Web/微信/飞书所有对话都经过它
- **RightNow 后端保留**，负责业务流程、数据 CRUD、前端展示、JWT 鉴权
- **OpenClaw 不改源码**，只改 workspace 文件 + 编写 rightnow 插件
- **知识库保留 RAG**，通过 3 个独立工具接 OpenClaw
- **用户数据通过 API 工具**暴露给 OpenClaw 实时调用
- **微信通道先切**，Web/飞书后续跟进
- **前端 UI 不变**，只改后端对话路由

---

## 1. 目标架构

### 1.1 架构全景图

```
                         互联网
                           │
                    NAT 103.236.92.40:25650
                           │
                    ┌──────▼──────────────────────────────────┐
                    │  nginx (rn-frontend) :80/:443           │
                    │                                         │
                    │  /          → 前端 React SPA            │
                    │  /api/*     → rn-backend:5000           │
                    │  /api/chat/ → rn-backend:5000           │
                    │  /imhook/   → openclaw-gateway:18789    │
                    │  /uploads/  → rn-backend:5000           │
                    └─────────────────────────────────────────┘
                           │                │
              ┌────────────▼──┐    ┌────────▼──────────────┐
              │ rn-backend    │    │ openclaw-gateway       │
              │ (NestJS)      │    │ (Node.js)              │
              │ port:5000     │    │ port:18789 (loopback) │
              │               │    │                        │
              │ JWT auth      │    │ workspace:             │
              │ CRUD APIs     │    │   SOUL.md/IDENTITY.md  │
              │ Chat proxy →  │◄──►│   AGENTS.md/HEARTBEAT  │
              │  转发到Gateway│    │   skills/ (13个)       │
              │               │    │   memory/ (用户记忆)   │
              │               │    │                        │
              │ Agent RPC API │    │ plugin: rightnow       │
              │ 供OpenClaw调  │    │   21个数据工具         │
              │               │    │   3个知识库工具        │
              └───────┬───────┘    └────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
  ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │PostgreSQL│ │ RAG      │ │ wechat-bridge│
  │:5432     │ │ :8000    │ │ :3000        │
  │29 models │ │ 4层知识库│ │ iLink → 微信  │
  └──────────┘ └──────────┘ └──────────────┘
```

### 1.2 数据流

```
用户发消息 (Web/微信/飞书)
    │
    ▼
RightNow 后端
    │ 解析 JWT/peerId → userId
    │
    ▼
OpenClaw Gateway
    │ 加载 agent session
    │ system prompt (SOUL/AGENTS/skills)
    │
    ▼
Agent Loop
    │ LLM 调用 (StepFun/DeepSeek/其他, 运维可配)
    │
    ├── Tool Call: rightnow_get_context  → 后端 API → 用户全量数据
    ├── Tool Call: search_faq            → RAG L1 FAQ (高精度)
    ├── Tool Call: search_core_theory    → RAG L2 核心理论
    ├── Tool Call: search_books          → RAG L3 营养学全书
    ├── Tool Call: rightnow_log_diet     → 后端 API → 写 DB
    ├── Tool Call: memory_search         → 本地 memory-core
    ├── Tool Call: rightnow_analyze_food → 后端 API → 食物分析
    └── Tool Call: ...
    │
    ▼
流式响应 → 后端 → 前端 (SSE) / 微信 (bridge push) / 飞书 (reply)
    │
    ▼
记忆沉淀 (flush plan + dreaming)
    │ 对话记忆 → memory/YYYY-MM-DD.md
    │ 用户偏好 → MEMORY.md
    │
    ▼
数据同步
    │ Web 端即时可见 (API 写入即同步 + WebSocket push)
```

### 1.3 安全红线（不可违背）

1. **浏览器绝不能直连 OpenClaw**。链路：`浏览器(JWT) → RightNow后端(校验JWT, 定userId) → 注入身份 → OpenClaw`
2. **DB 是唯一事实源**。硬数据（体重/饮食/训练）只在 PostgreSQL
3. **OpenClaw HTTP 仅限 loopback**（`127.0.0.1`），不暴露公网

---

## 2. 修改规划——按功能模块

### Track 0：前置 ─ 评估流程修复（立即执行，已有 agent 在进行）

> **状态**：🔧 施工中（agent a261545e + agent a3174d）

**T0-A：评估卡死代码修复**

| 项目 | 内容 |
|------|------|
| 文件 | `frontend/src/views/AIChat.tsx` |
| 改动 | `startOnboarding()` 先调 `GET /ai-coach/assessment` → `setAssessmentData()` → `setCoachStage('assessment')` |
| 文件 | `frontend/src/services/gemini.ts` |
| 改动 | 导出 `GOAL_DIRECTION_LABELS` 和 `STAGE_LABELS` |
| 验收 | 点击"开始私教评测" → 弹出评估卡（BMI/BMR/TDEE 预计算值 + 可编辑 + 周选择器） |

**T0-B：深度评估流程精简 + 预期管理追加**

| 项目 | 内容 |
|------|------|
| 文件 | `frontend/src/views/AIChat.tsx` |
| 改动 | `EXTENDED_INTAKE_STEPS` 从 21 题 6 类缩减为 6 题（Q1训练天数/Q2时长/Q3力量水平合并题/Q4饮食/Q5伤病/Q6提醒时间） |
| 文件 | `frontend/src/views/AIChat.tsx` （delivery 部分） |
| 改动 | 在 stage1 和 stage2 之间插入预期管理段（4 层递进结构） |
| 文件 | `backend/src/ai-coach/ai-coach.module.ts`（如需） |
| 改动 | 精简后的 intake DTO 字段设为 optional |
| 验收 | 评估卡确认后 → 6 题聊天式深度评估 → 预期管理 → 4 段交付 |

---

### Track 1：OpenClaw Gateway 部署

**目标**：在服务器上构建并运行 OpenClaw Gateway 容器

| # | 文件/操作 | 内容 |
|---|-----------|------|
| 1.1 | `docker-compose.prod.yml` | 新增 `openclaw-gateway` 服务定义（镜像构建自 `/root/rightnow/openclaw/`，端口 18789 loopback） |
| 1.2 | `openclaw/.env` | Gateway 配置：LLM provider（StepFun/DeepSeek）、agent defaults、gateway token |
| 1.3 | nginx.conf | 修改 `/imhook/` upstream 从 `openclaw-agent:18789` 改为 `openclaw-gateway:18789` |
| 1.4 | 新增 `/api/chat/` 代理规则 | nginx 把 `/api/chat/send` 反代到 backend，backend 内部转发到 Gateway |
| 1.5 | `docker compose up -d openclaw-gateway` | 启动并验证 `/health` |

**依赖**：无（立即启动）  
**验收**：`curl http://127.0.0.1:18789/health` 返回 200

---

### Track 2：RightNow OpenClaw 插件

**目标**：编写 OpenClaw 插件，注册 RightNow 数据工具 + 知识库工具

**目录**：`openclaw/extensions/rightnow/`（新建，或在现有基础上改造）

| # | 文件 | 内容 |
|---|------|------|
| 2.1 | `extensions/rightnow/openclaw.plugin.json` | 插件清单：id=`rightnow`，声明 tools 契约、env vars（`AGENT_SERVICE_TOKEN`、`RIGHTNOW_API_BASE`） |
| 2.2 | `extensions/rightnow/index.ts` | `definePluginEntry({id:"rightnow", register(api){...}})`，注册所有工具 + prompt supplement |
| 2.3 | `extensions/rightnow/src/rightnow-tools.ts` | 21 个 RightNow 数据工具实现，每个工具 `execute()` 用 `fetch()` 调 `POST http://backend:5000/api/agent/rpc` |
| 2.4 | `extensions/rightnow/src/rightnow-knowledge.ts` | 3 个知识库工具：`search_faq`、`search_core_theory`、`search_books`，各调 RAG 服务不同 collection |
| 2.5 | `extensions/rightnow/src/rightnow-prompt.ts` | Prompt supplement：告诉 agent 何时用哪个数据工具、何时用哪个知识库工具、每条消息开始前调 `rightnow_get_context` |

**21 个数据工具清单**（从现有小爪 tools.js + TOOL_RPC_MAP 迁移）：

```
P0 身份与上下文:
  rightnow_bind_email        → auth.bind
  rightnow_get_context       → memory.context.assemble
  rightnow_get_profile       → user.profile.get
  rightnow_get_onboarding    → user.onboarding.get
  rightnow_get_goal_image    → user.goal_image.get

P1 饮食:
  rightnow_diet_summary_today → diet.summary.today
  rightnow_log_diet           → diet.log.create
  rightnow_analyze_food_text  → diet.analyze.text
  rightnow_analyze_food_image → diet.analyze.image
  rightnow_get_diet_gap       → diet.gap.today
  rightnow_diet_recent_list   → diet.recent.list

P2 训练:
  rightnow_get_today_training       → training.plan.today
  rightnow_start_training           → training.session.start
  rightnow_update_training          → training.session.update
  rightnow_complete_training        → training.session.complete
  rightnow_recent_training_by_muscle→ training.recent.by_muscle
  rightnow_get_current_session      → training.session.current

P3 待办:
  rightnow_get_today_todos  → todo.today.list
  rightnow_complete_todo    → todo.complete
  rightnow_create_todo      → todo.create

P4 知识:
  (移除 rightnow_search_knowledge，改为 3 个独立知识库工具)
```

**3 个知识库工具**：

```typescript
search_faq(query, topK=5, minScore=0.5)        → RAG L1 FAQ (高精度快速匹配)
search_core_theory(query, topK=5, minScore=0.3) → RAG L2 核心理论
search_books(query, topK=5)                      → RAG L3 营养学全书 + Blogger
```

**依赖**：Track 1（Gateway 运行）  
**验收**：Plugin 加载成功，`rightnow_get_context` 返回有效 JSON，3 个 search 工具返回不同层级结果

---

### Track 3：RightNow 后端改造

**目标**：后端 ChatController 从"纯文本 LLM"改为"转发到 OpenClaw Gateway"

| # | 文件 | 内容 |
|---|------|------|
| 3.1 | `backend/src/chat/chat.service.ts` | `send()` 方法改为：构建 messages → `POST http://openclaw-gateway:18789/v1/chat/completions`（SSE 流式）→ 解析流式响应 → 返回完整 reply |
| 3.2 | `backend/src/chat/chat.controller.ts` | `/api/chat/send` 和 `/chat/internal/send-as` 保持不变，只改底层 `ChatService.send()` |
| 3.3 | `backend/src/chat/llm-chat.helper.ts` | 可保留作 fallback，或标记 deprecated |
| 3.4 | `backend/src/agent/agent-rpc.service.ts` | 保持现有 RPC 端点（`POST /api/agent/rpc`），OpenClaw 工具调用此接口 |
| 3.5 | **新增** `backend/src/common/openclaw-client.ts` | OpenClaw Gateway 客户端封装：`sendChat(userId, messages) → AsyncIterable<string>` |

**依赖**：Track 1（Gateway 运行）  
**验收**：Web 端发消息 → 后端转发 Gateway → 流式返回 → 前端显示

---

### Track 4：Workspace 与 Prompt 工程

**目标**：把 FitClaw 的人设/技能/知识库配置为 OpenClaw workspace

**目录**：`openclaw-workspace/`（新建，与 `/root/rightnow/openclaw/` 同级）

| # | 文件 | 内容 | 来源 |
|---|------|------|------|
| 4.1 | `SOUL.md` | 四重性格定义 | 直接复制 fitclaw-package 版本（101 行） |
| 4.2 | `IDENTITY.md` | "小爪，AI 健身与饮食追踪助手" | fitclaw-package |
| 4.3 | `AGENTS.md` | 9 阶段交互生命周期 + 9 条原则 + 工具路由规则 | fitclaw-package 407 行版，适配 rightnow 工具名 |
| 4.4 | `HEARTBEAT.md` | 定时主动触达规则 | fitclaw-package（120 行） |
| 4.5 | `TOOLS.md` | 工具说明（给 agent 看的） | 新写，覆盖 21 个数据工具 + 3 个知识库工具 |
| 4.6 | `skills/fitclaw-coach/SKILL.md` | 高级教练角色 SOP | fitclaw-package |
| 4.7 | `skills/fitclaw-onboarding/SKILL.md` | 新用户引导 SOP | fitclaw-package |
| 4.8 | `skills/fitclaw-assessment-init-plan/SKILL.md` | 深度评估+初始化方案 SOP | fitclaw-package（适配 6 题版） |
| 4.9 | `skills/fitclaw-nutrition/SKILL.md` | 饮食建议 SOP（含配额规则） | fitclaw-package |
| 4.10 | `skills/fitclaw-food-photo/SKILL.md` | 食物照片分析 SOP | fitclaw-package |
| 4.11 | `skills/fitclaw-training/SKILL.md` | 训练框架 SOP（3/4 分化 + 重量校准） | fitclaw-package |
| 4.12 | `skills/fitclaw-hydration/SKILL.md` | 饮水目标+提醒 SOP | fitclaw-package |
| 4.13 | `skills/fitclaw-reports-reengage/SKILL.md` | 日报/周报/月报 SOP | fitclaw-package |
| 4.14 | `skills/fitclaw-proactive-outreach/SKILL.md` | 被动触达系统 SOP | fitclaw-package |
| 4.15 | `memory/knowledge/好人松松精华/` | 16 篇专业知识 markdown | fitclaw-package（给 memory-core 索引） |
| 4.16 | `MEMORY.md` | 长期记忆文件（初始为空） | OpenClaw 自动管理 |

**AGENTS.md 关键适配**（在 fitclaw 原版基础上）：

```markdown
## 知识库使用规则

- FAQ 快速匹配（用户问常见问题）→ search_faq(query, minScore=0.5)
- 核心理论（训练计划/动作/饮食原理）→ search_core_theory(query)
- 深度知识（营养学/研究/博客）→ search_books(query)
- 用户个人记忆（偏好/习惯/历史）→ memory_search(query)

## 数据读写规则

- 每条消息开始前 → rightnow_get_context
- 未绑定 → 引导用户在 Web 端生成绑定码
- 写入前确认 → 展示分析结果让用户确认
```

**依赖**：无（纯文件），可与 Track 1 并行  
**验收**：Gateway 加载 workspace 后，agent 对话风格符合 FitClaw 人设

---

### Track 5：微信通道接入 OpenClaw

**目标**：微信消息不再走 `ChatService.send()`，改为经过 OpenClaw agent

| # | 文件 | 内容 |
|---|------|------|
| 5.1 | `backend/src/chat/chat.controller.ts` | `POST /chat/internal/send-as` 改为调用 OpenClaw（参考 Track 3 的 openclaw-client） |
| 5.2 | `wechat-bridge/bridge.mjs` | 保持不变——bridge 继续调 `/chat/internal/send-as` |
| 5.3 | `backend/src/chat/chat.service.ts` | `source='wechat'` 跳过 pushToUser 的逻辑保留 |

**微信消息流**：
```
微信 iLink → bridge poll → POST /chat/internal/send-as (peerId)
    → 后端解析 peerId → userId
    → 转发 OpenClaw Gateway (注入 userId + channel=wechat)
    → Agent loop (工具调用读写 DB)
    → 流式响应 → bridge push 回微信
```

**依赖**：Track 1 + Track 3  
**验收**：微信发送"我今天吃了鸡胸肉 200g" → agent 调 `rightnow_log_diet` → Web 端可见 → 微信收到确认回复

---

### Track 6：部署与运维

**目标**：统一 compose 编排、回滚预案、旧组件下线

| # | 操作 | 内容 |
|---|------|------|
| 6.1 | `docker-compose.prod.yml` | 加 `openclaw-gateway` 服务，挂载 workspace 目录和插件目录 |
| 6.2 | `nginx.conf` | `/imhook/` 切流到 `openclaw-gateway:18789`，确认 `/api/chat/` 路由 |
| 6.3 | 下线 `rn-openclaw-agent` 容器 | `docker stop rn-openclaw-agent && docker rm rn-openclaw-agent` |
| 6.4 | `.env` | 新增 `OPENCLAW_GATEWAY_URL`、`OPENCLAW_GATEWAY_TOKEN` |
| 6.5 | `backups/` | 切流前备份 compose + nginx + .env |
| 6.6 | 回滚脚本 | `backups/rollback-to-xiaozhua.sh` 保留 |

**依赖**：全部 Track 完成后  
**验收**：docker compose 全栈启动，所有容器 healthy，Web/微信/飞书对话正常

---

## 3. Agent Teams 并行施工方案

### 3.1 轨道依赖图

```
                    ┌─────────────────┐
                    │ Track 0          │ ◀── 即刻（已在进行）
                    │ 评估流程修复    │
                    └────────┬────────┘
                             │ (完成后释放 AIChat.tsx)
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ Track 1  │    │ Track 4       │    │ Track 2      │
│ Gateway  │    │ Workspace     │    │ Plugin 开发  │
│ 部署     │    │ 文件准备      │    │              │
└────┬─────┘    └──────┬───────┘    └──────┬───────┘
     │                 │                   │
     │   契约A:        │                   │
     │   Gateway       │                   │
     │   URL + Token   │                   │
     │                 │                   │
     ▼                 ▼                   ▼
┌──────────────────────────────────────────────┐
│  Track 3: 后端 OpenClaw 客户端               │
│  Track 5: 微信通道接入                        │
│  (可并行)                                    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Track 6: 部署    │
              │ 全栈上线 + 下线   │
              └─────────────────┘
```

### 3.2 施工波次

**第一波（立即启动，5 条并行轨道）**：

| 轨道 | Agent 职责 | 操作范围 | 依赖 |
|------|-----------|---------|------|
| **T0-A** | 评估卡死代码修复 | `frontend/src/views/AIChat.tsx`, `frontend/src/services/gemini.ts` | 无 |
| **T0-B** | 深度评估精简 + 预期管理 | `frontend/src/views/AIChat.tsx`, `backend/src/ai-coach/` | 无 |
| **T1** | Gateway 部署 | `docker-compose.prod.yml`, `/root/rightnow/openclaw/` 构建 | 无 |
| **T4** | Workspace 准备 | `/root/rightnow/openclaw-workspace/` 新建目录+文件 | 无 |
| **T2** | 插件编写 | `/root/rightnow/openclaw/extensions/rightnow/` | 无（文件级并行） |

**第二波（第一波完成后）**：

| 轨道 | Agent 职责 | 依赖 |
|------|-----------|------|
| **T3** | 后端 ChatService → OpenClaw 转发 | T1（Gateway 可达） |
| **T5** | 微信通道接入 | T1 + T3 |

**第三波（收尾）**：

| 轨道 | Agent 职责 | 依赖 |
|------|-----------|------|
| **T6** | 全栈上线 + 旧组件清理 | T1-T5 全部完成 |

### 3.3 文件冲突防重约定

| 文件 | 可同时操作 | 规则 |
|------|-----------|------|
| `frontend/src/views/AIChat.tsx` | ❌ T0-A 和 T0-B 冲突 | T0-A 先改完，T0-B 基于 T0-A 结果再改 |
| `docker-compose.prod.yml` | T1 独占 | 其他轨道不碰 |
| `nginx.conf` | T1 独占 | 其他轨道不碰 |
| `backend/src/chat/` | T3 独占 | T0 不碰此目录 |
| `backend/src/ai-coach/` | T0-B 独占 | T3 不碰此目录 |
| `openclaw/extensions/rightnow/` | T2 独占 | 独立目录 |
| `openclaw-workspace/` | T4 独占 | 独立目录 |
| `wechat-bridge/` | T5 独占 | 独立目录 |

---

## 4. 验收清单

### 4.1 功能验收

- [ ] 用户点击"开始私教评测" → 弹出评估卡（BMI/BMR/TDEE 可编辑 + 周选择器）
- [ ] 评估卡确认后 → 6 题聊天式深度评估（每轮 1 题，不跳题）
- [ ] 深度评估完成后 → 预期管理段（生理真相 + 时间线 + 波动容忍 + 失败预案）
- [ ] 预期管理确认后 → 现状评估 → 饮食建议 → 训练框架（分步等待确认）
- [ ] Web 端发消息 → AI 回复（流式输出）
- [ ] Web 端发"我今天吃了鸡胸肉 200g" → agent 调 `rightnow_log_diet` → 写入 DB
- [ ] 微信发送绑定码 → 绑定成功 → 微信发消息 → agent 正确回复
- [ ] 微信发"我今天练了胸" → agent 调 `rightnow_start_training` → Web 端可见
- [ ] Agent 问"平台期怎么办" → agent 调 `search_core_theory` 返回专业内容
- [ ] 飞书消息 → agent 正常回复（验证切流后飞书通道仍可用）

### 4.2 技术验收

- [ ] `docker compose ps` 显示 openclaw-gateway healthy
- [ ] `curl http://127.0.0.1:18789/health` 返回 200
- [ ] OpenClaw 插件加载无报错（gateway 日志）
- [ ] 后端转发 OpenClaw 不超时（12s 内返回首 token）
- [ ] RAG 服务正常响应知识库查询
- [ ] Agent Service Token 鉴权正常

---

## 5. 技术债与后续优化

| # | 内容 | 优先级 |
|---|------|--------|
| 5.1 | 飞书通道切到 OpenClaw（目前飞书仍走小爪） | P1 |
| 5.2 | 生图 API（`/image-gen/ideal-body`）接 OpenClaw 工具 | P1 |
| 5.3 | OpenClaw memory dreaming 启用（跨会话记忆） | P2 |
| 5.4 | 流式输出前端适配（打字机效果） | P2 |
| 5.5 | 多用户 agent 隔离验证 | P2 |
| 5.6 | 清理根目录散落的 `fix*.sh` / `f*.sh` / `deploy*.sh` 脚本 | P3 |

---

## 6. 附录

### 6.1 关键路径

| 路径 | 说明 |
|------|------|
| `/root/rightnow/` | RightNow 项目根目录 |
| `/root/rightnow/openclaw/` | OpenClaw 源码（不改动） |
| `/root/rightnow/openclaw-workspace/` | **新建** OpenClaw workspace 文件 |
| `/root/rightnow/openclaw/extensions/rightnow/` | **新建/改造** RightNow 插件 |
| `/root/rightnow/docker-compose.prod.yml` | 生产环境 compose 编排 |
| `/root/rightnow/nginx.conf` | Nginx 配置 |
| `/root/rightnow/.env` | 环境变量（密钥源） |
| `/root/rightnow/backend/src/chat/` | 后端聊天模块 |
| `/root/rightnow/backend/src/agent/` | 后端 Agent RPC 模块 |
| `/root/rightnow/backend/src/ai-coach/` | 后端 AI 教练模块 |
| `/root/rightnow/frontend/src/views/AIChat.tsx` | 前端 AI 聊天视图 |
| `/root/rightnow/wechat-bridge/bridge.mjs` | 微信桥接 |
| `D:/openclaw2/openclaw/` | 本地 OpenClaw 源码参考 |
| `D:/openclaw2/fitclaw-package/` | FitClaw workspace 参考 |

### 6.2 环境变量

```bash
# 新增（OpenClaw 相关）
OPENCLAW_GATEWAY_URL=http://openclaw-gateway:18789
OPENCLAW_GATEWAY_TOKEN=<生成>
OPENCLAW_WORKSPACE_DIR=/root/rightnow/openclaw-workspace

# 已有（保持不变）
AGENT_SERVICE_TOKEN=<已有>
INTERNAL_API_TOKEN=<已有>
DATABASE_URL=<已有>
JWT_SECRET=<已有>
STEPFUN_API_KEY=<已有>
STEPFUN_BASE_URL=https://api.stepfun.com/v1
DEEPSEEK_BASE_URL=<已有>
DEEPSEEK_API_KEY=<已有>
POSTGRES_PASSWORD=<已有>
FEISHU_APP_ID=<已有>
FEISHU_APP_SECRET=<已有>
```

---

> **施工指令**：Agent teams 按 §3.2 波次启动。每条轨道的 agent 读取各自分配的 §2 小节作为任务包，严格在文件边界内操作，不跨轨道修改。完成后更新验收清单。
