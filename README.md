# RightNow 3.2

RightNow 是一个 AI 驱动的私人健身教练系统。它不是单纯的健身记录工具，而是把用户身体数据、训练计划、饮食记录、饮水计划、AI 对话、知识库和微信 Bot 串成一套可执行的“AI 私教闭环”。

当前版本已经进入 RightNow x OpenClaw 架构：RightNow 负责结构化业务数据与产品体验，OpenClaw 负责多通道智能体、工具调用、记忆和会话运行时。

## 核心创新

### 1. 结构化事实层 + AI 记忆层

RightNow 使用 PostgreSQL 保存真实业务数据：

- 用户档案、身体数据、目标体型
- 体重、饮食、训练、TODO
- AI 私教评估、深度问卷、首版计划、执行进度
- 微信绑定、Agent 工具调用审计

OpenClaw 保存智能体会话、长期记忆、每日记忆和工具调用上下文。两者分工明确：

- RightNow 数据库是事实来源。
- OpenClaw memory/session 是 AI 教练的语义记忆。
- RAG 知识库提供专业健身和营养知识。

### 2. 可执行的 AI 私教计划

AI 不只输出一段建议，而是生成可以落地执行的数据：

- 训练计划：几分化、今天练什么、具体动作、重量、组数、次数
- 饮食计划：每日热量、碳水、蛋白质、脂肪目标
- 饮水计划：每日饮水量、时间点、每次饮水量
- TODO 展开：每个训练动作都会进入今日 TODO
- 数据看板：饮食和宏量目标与实际记录同步

### 3. Web 与微信 Bot 同脑

用户可以在 Web 端完成注册、建档、理想图生成和私教评估；后续微信 Bot 可以继续同一个用户的对话和数据：

- 微信绑定后识别用户身份
- 微信消息进入同一套 Chat/Agent 链路
- 食物拍照和饮食记录可同步回 Web 看板
- 训练、饮食、TODO、计划数据都来自同一套后端事实层

### 4. OpenClaw 工具化智能体

RightNow 通过 OpenClaw 插件把业务能力暴露为工具：

- 读取用户完整上下文
- 查询今日饮食/训练/TODO
- 分析食物文字和图片
- 写入饮食记录
- 创建或完成 TODO
- 开始、更新和完成训练会话
- 检索 FAQ、核心理论和书籍知识库

这让 AI 教练可以真正读写产品数据，而不是只做聊天回复。

### 5. 分层 RAG 健身知识库

知识库分成多层：

- L1 FAQ：高频问题快速回答
- L2 Core Theory：训练、营养、动作选择等核心理论
- L3 Books：更深层的营养学、书籍和资料

AI 教练可以先给出明确建议，再按需检索更深入的理论依据。

## 主要功能

### 新用户链路

1. 注册/登录
2. 填写身体数据：性别、身高、体重、年龄
3. 选择理想体型
4. 上传当前照片
5. 生成理想身材图
6. 进入私教模块
7. 确认诊断卡
8. 完成深度沟通问题
9. 生成首版私教方案
10. 确认执行并存档

### AI 私教模块

- 诊断卡：BMI、BMR、TDEE、体脂估算、目标周期
- 深度问卷：训练频率、单次时长、饮食环境、伤病限制
- 训练计划：按每周可训练天数生成一分化/三分化/四分化
- 动作编辑：支持修改动作、重量、组数、次数
- 饮水计划：支持修改时间点和每次饮水量
- 方案存档：再次进入私教模块时不重复评估

### 饮食模块

- 手动记录饮食
- 食物文字识别
- 食物图片识别
- 餐前拍照预估
- 今日热量汇总
- 碳水、蛋白质、脂肪统计

### 训练模块

- 今日训练动作
- 训练会话
- 动作、重量、次数记录
- 同肌群历史查询
- 训练反馈卡

### TODO 与看板

- 今日训练动作展开到 TODO
- 饮食目标与宏量目标进入数据看板
- 训练、饮食、饮水计划可形成每日执行闭环

### 微信 Bot

- Web 端生成绑定码
- 微信端发送绑定码完成绑定
- 微信消息转发到 RightNow 后端
- 后端进入 OpenClaw/Chat 链路
- 回复再通过微信桥发回用户

## 技术架构

```text
React Web App
  -> Nginx
  -> NestJS Backend
  -> PostgreSQL
  -> OpenClaw Gateway
  -> RightNow OpenClaw Plugin
  -> RAG Service
  -> WeChat Bridge
```

### 前端

- React
- Vite
- TypeScript
- Tailwind-style utility classes
- Axios API client
- Three.js / React Three Fiber

### 后端

- NestJS
- Prisma
- PostgreSQL
- JWT auth
- Multer/static uploads
- StepFun/OpenAI-compatible model calls
- OpenClaw Gateway client

### AI/Agent

- OpenClaw Gateway
- OpenAI-compatible `/v1/chat/completions`
- Per-user agent routing
- Tool calling
- Memory/session persistence
- Plugin hooks

### RAG

- FastAPI-style Python service
- Chroma/vector persistence
- FAQ/core/books multi-layer retrieval

### 微信桥

- Node.js
- Tencent iLink Bot API
- Internal token protected backend calls

## Repository Layout

```text
backend/                 NestJS API and Prisma schema
frontend/                React/Vite web app
rag-service/             RAG service and ingestion scripts
wechat-bridge/           WeChat iLink bridge
openclaw/extensions/     RightNow OpenClaw plugin
docs/                    Architecture and implementation notes
docker-compose.prod.yml  Production compose template
nginx.conf               Nginx SPA/API proxy template
```

## Environment

Copy `.env.example` to `.env` and fill in private values locally or on your server.

Do not commit:

- `.env`
- `.env.*`
- API keys
- database passwords
- gateway tokens
- certificates
- upload data
- WeChat login tokens

## Local Development

Install dependencies:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

Start services according to your local Docker/PostgreSQL/OpenClaw setup. The production compose file is a template and expects private secrets from `.env`.

## External Runtime Dependencies

This repository keeps the RightNow application code, the RightNow OpenClaw extension, and safe deployment templates.

The following runtime assets are intentionally not committed:

- real `.env` files and production secrets
- TLS certificates and server-specific Nginx assets
- OpenClaw upstream runtime/source checkout used by production images
- RAG raw knowledge folders such as `cleaned-data/`, `blogger-data/`, `l1-faq/`, `l2-core/`, and `l3-books/`
- upload files, WeChat login state, vector database volumes, and database dumps

For production deployment, provide those private/runtime assets on the server through `.env`, Docker volumes, or a separate private provisioning process.

## Security Notes

- Browser clients should only talk to RightNow backend APIs.
- OpenClaw Gateway tokens must stay server-side.
- Agent tool calls go through `/api/agent/rpc` with `AGENT_SERVICE_TOKEN`.
- User-facing Web auth uses JWT.
- WeChat bridge internal calls use `INTERNAL_API_TOKEN`.
- Production server IPs, domains, certificates and real API keys are intentionally not stored in this repository.

## Current Product Direction

RightNow is moving toward a full AI private coach loop:

```text
User data
  -> AI assessment
  -> structured training/diet/water plan
  -> TODO execution
  -> food/training logging
  -> dashboard feedback
  -> AI adjustment
  -> Web + WeChat continuous coaching
```

The goal is not only to answer fitness questions, but to help users execute the plan every day with persistent context and measurable feedback.
