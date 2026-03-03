# CLAUDE_PROJECT_MEMORY.md
> 本文件是 Claude Code、Codex 及其他代理共享的仓库记忆源。记录稳定事实、关键决策、当前进度和交接信息。

---

## 1. 项目快照

- 项目：RightNow Fitness 前端 + 配套后端
- 目标：构建一个移动端优先的健身应用，包含 AI 对话、体型进化、记录追踪和社区能力
- 当前形态：前端为 React + TypeScript + Vite SPA；后端位于 `rightnow-api/`，为 NestJS
- 共享记忆协议生效日期：2026-03-01

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 备注 |
|------|------|------|------|
| 前端框架 | React | 19.2.4 | SPA，无 React Router |
| 语言 | TypeScript | 5.8.2 | |
| 构建工具 | Vite | 6.2.0 | 默认开发端口 5173 |
| 样式 | Tailwind CSS | - | 深色主题，主色 #B8FF00 |
| 3D 渲染 | Three.js + R3F + Drei | - | Hero3D 组件 |
| 图表 | Recharts | 3.7.0 | |
| AI | Google Gemini API | 1.5-flash | EvolutionEngine 对话 |
| 后端框架 | NestJS | - | `rightnow-api/` |
| ORM | Prisma | 6.19.2 | |
| 数据库 | PostgreSQL | 16-alpine | Docker，端口 15433 |
| 认证 | JWT + bcrypt | - | |

---

## 3. 协作模式与分工（2026-03-02 更新）

本项目有三类协作者，文档和 PR 需同时面向人类和 AI Agent 可读。

### 负责人（用户）+ AI Agent
- **负责模块**：AI 教练（`views/AIChat.tsx`）、数据看板（`views/DataDashboard.tsx`）、待办/TODO 功能
- **工作方式**：用户定方向 → Claude Code 架构设计 → Codex 代码实现
- **工作分支**：`feat/ai-chat`、`dev`

### 技术团队（人类开发者）
- **负责模块**：饮食拍摄（`views/DietLog.tsx`）、社区功能（`views/Community.tsx`）
- **参考文档**：`COMMUNITY_FEATURE_SPEC.md`（社区功能规格书，已在项目中）
- **工作分支**：`feat/diet-camera`、`feat/community`

### UI/前端优化
- **负责方**：Antigravity Agent
- **工作分支**：`feat/ui-polish`

### Git 工作流
- **仓库**：`BeAChanger/RightNow-3.2`（Private，GitHub）
- **分支策略**：
  - `main` — 稳定版，只通过 PR 合入
  - `dev` — 集成分支，所有 feature 先合到这里
  - `feat/*` — 功能分支，按模块划分
- **合并流程**：feature → PR → dev（集成测试）→ PR → main
- **详细规则**：见 `GIT_WORKFLOW.md`

---

## 4. 架构与约定

### 前端

- 路由：使用 `View` 枚举 + `useState<View>` 切换视图，不使用 React Router
- 状态：`App.tsx` 提升管理用户基础数据，再通过 props 下传
- API 层：`api/client.ts` 负责 Axios 实例、JWT 附加和响应解包；`api/index.ts` 统一导出
- UI 语言：全中文
- 图标：Google Material Icons（Outlined / Round）
- 设计约束：移动端优先，支持安全区域

### 后端

- 框架：NestJS，模块化结构
- 认证接口：`POST /auth/register`、`POST /auth/login`、`GET /auth/me`
- 数据层：PostgreSQL + Prisma
- 已有模块：`auth`、`weight`、`diet`、`training`、`todos`、`checkins`、`evolution`、`posts`、`friendships`、`chat`、`upload`、`user`
- CORS：`http://localhost:5173`

### 协作约定

- 本文件是项目状态唯一共享事实源，不再拆分为多个代理专用记忆文件
- 所有共享技能统一注册在 `SKILL_REGISTRY.md`，技能文件存放于 `skills/<name>/SKILL.md`
- 4 个核心技能（fankui、project-orchestrator、feature-co-creation-socratic-frontend、skill-co-learn）已全局安装到各 Agent 默认路径
- 高价值经验沉淀与三体 Agent 共学优先参考 `skills/skill-co-learn/SKILL.md`
- 产品功能共创与 `/function-talk` 优先参考 `skills/feature-co-creation-socratic-frontend/SKILL.md`
- 详细参考可回看 `.claude/commands/*.md`，但项目状态应回写到本文件

---

## 5. 当前稳定决策

- 所有界面文案必须保持中文，不维护英文 UI
- 不创建重复页面文件，尤其避免恢复此前已清理的 `*Screen.tsx` 副本
- 保留用户已有改动，不做重置式操作
- 优先模块化推进，一次聚焦一个模块
- 默认按“最小可行改动”修复问题，避免过度工程化

---

## 6. 最近重要变更

| 日期 | 负责方 | 类型 | 描述 |
|------|--------|------|------|
| 2026-02-28 | 双方 | 配置 | Docker PostgreSQL 启动，Prisma schema 同步完成 |
| 2026-02-28 | 双方 | 功能 | 完成全部 10 个模块中英文统一，UI 全中文化 |
| 2026-02-28 | 双方 | 修复 | 修复 `vite-env.d.ts` 和 `Onboarding.tsx` 编码损坏问题 |
| 2026-02-28 | 双方 | 重构 | 合并重复文件（`Login/LoginScreen`、`Register/RegisterScreen`） |
| 2026-02-28 | 双方 | 功能 | `Login.tsx` 合并演示账号能力（`demo@rightnow.fit`） |
| 2026-03-01 | Codex | 协作 | 建立共享记忆协议，新增 `AGENTS.md` 与 `shared-skills/` 统一跨代理工作流 |
| 2026-03-01 | Codex | 协作 | 新增正式仓库技能 `skills/fankui/SKILL.md`，对齐 Claude 的 `/fankui` 工作流 |
| 2026-03-01 | Codex | 修复 | 修复显化页首屏生成状态、强化生图安全 prompt 与纯色背景约束，并修复正脸融合未传参考图的 bug |
| 2026-03-01 | Codex | 修复 | 修复打卡成功页错误跳回 Onboarding、修复浮动助手定时器泄漏与拖拽误触，并校正 `checkinsApi.latest()` 的可空返回类型 |
| 2026-03-01 | Codex | 修复 | 修复数据看板 AI 建议缓存不刷新、修复饮食页同图重复上传不触发、修复社区评论输入跨帖子串值，并限制“加载更多”重复触发 |
| 2026-03-01 | Codex | 文档 | 检查并恢复本地开发环境，确认 `5173` 与 `3000` 可访问，并新增 `LOCAL_DEV_STARTUP.md` 启动指南 |
| 2026-03-01 | Codex | 协作 | 将 `skills/skill-co-learn/SKILL.md` 升级为 v4.0 全局/项目智能版，新增强制 Scope 判断与路径智能适配规则 |
| 2026-03-02 | Claude Code | 配置 | 建立 Git 多人多 Agent 协作模式：新建 Private 仓库 BeAChanger/RightNow-3.2，创建 dev + 5 个 feat/* 分支，编写 GIT_WORKFLOW.md |
| 2026-03-02 | Claude Code | 协作 | 统一技能系统：新建 SKILL_REGISTRY.md 注册表，合并 shared-skills/ → skills/，4 个核心技能全局安装到 Claude Code / Codex / Antigravity，入口文件统一指向注册表 |
| 2026-03-02 | Claude Code | 文档 | 明确三方协作分工：负责人+Agent（AI教练/数据看板/TODO）、技术团队（饮食拍摄/社区）、Antigravity（UI），删除已解决的问题反馈文件夹，更新所有协作文档保持一致 |

---

## 7. 当前待办

### 负责人 + AI Agent（当前执行中）
- [ ] AI 教练功能完善（`AIChat.tsx`） — 对话体验、上下文记忆、训练建议
- [ ] 数据看板功能完善（`DataDashboard.tsx`） — 统计图表、趋势分析
- [ ] 待办/TODO 功能 — 用户训练计划管理

### 技术团队（人类开发者负责）
- [ ] 饮食拍摄功能（`feat/diet-camera`） — 拍照识别、卡路里计算
- [ ] 社区功能（`feat/community`） — 详见 `COMMUNITY_FEATURE_SPEC.md`

### 基础联调
- [ ] 本地联调测试（后端 `start:dev` + 前端 `dev`）
- [ ] 注册/登录流程端到端验证
- [ ] Onboarding 数据提交到后端验证

---

## 8. 风险与阻塞

- 前后端虽已具备基础结构，但联调验证尚未完整闭环
- 共享记忆机制刚建立，后续需要持续回写，才能真正形成跨代理上下文连续性
- 生产构建已通过，但前端主包仍约 714.69 kB，存在后续拆包优化空间

---

## 9. 协作偏好

- 用户是开发新手，解释要简洁易懂
- 所有对用户沟通优先使用中文
- 需要可接手性强的上下文，方便 Claude Code、Codex 或其他 AI 无缝继续

---

## 10. 交接清单

在开始非琐碎任务前：

- 先阅读本文件
- 查看 `SKILL_REGISTRY.md` 了解可用技能

在完成有意义的改动后：

- 更新本文件的”最近重要变更 / 当前待办 / 风险与阻塞”相关栏目
- 如果是阶段性推进，同时更新 `PROJECT_REPORT.md`

---

## 11. 通用记忆更新模板

当需要追加一次新的项目记录时，优先按下面格式更新，尽量保持简短、可检索、可交接。

```md
### 更新记录（YYYY-MM-DD）

- 负责方：Claude / Codex / 用户 / 双方
- 类型：功能 / 修复 / 重构 / 配置 / 协作 / 文档
- 影响范围：涉及的模块、页面、接口或目录
- 变更内容：这次实际改了什么
- 决策/约束：这次确定了什么规则，后续要继续遵守什么
- 后续动作：还剩什么要做，谁接手时先看什么
- 风险/注意：是否有未验证项、联调风险、兼容性风险
```

推荐更新方式：

- 如果是已完成改动，优先同步到“最近重要变更”
- 如果是新增待办，优先同步到“当前待办”
- 如果是新发现的问题，优先同步到“风险与阻塞”
- 如果是长期规则变化，优先同步到“当前稳定决策”或“协作偏好”

## 12. Update Log (2026-03-02)

- Codex: fixed the Onboarding custom ideal image picker by switching from hidden-input `ref.click()` to native `label` / `input[type=file]` binding for more reliable mobile uploads.

## 13. AI Coach Architecture Sync (2026-03-02)

- `AI_COACH_ARCHITECTURE.md` is already present and is now the active handoff contract for AI Coach implementation.
- Codex starts with the non-UI slices: `public/knowledge/*`, `api/ai-coach.ts`, `api/index.ts`, `services/gemini.ts`, then backend `ai-coach` module and Prisma changes.
- Antigravity owns the UI state machine and coach cards; backend/API work should preserve the documented contract and adapt to the locked UI.

## 14. AI Coach Bootstrap Implementation (2026-03-02)

- Completed in code: `public/knowledge/*`, `api/ai-coach.ts`, `api/index.ts`, `services/gemini.ts` coach helpers, `rightnow-api/src/ai-coach/ai-coach.module.ts`, `rightnow-api/src/app.module.ts`, and `vite.config.ts` proxy support.
- The temporary `FitnessPlan.aiSummary` bootstrap path has been replaced: AI Coach now uses dedicated Prisma models in `rightnow-api/prisma/schema.prisma`.
- Prisma client types were regenerated with `npx prisma generate --no-engine` because the Windows query engine DLL was locked; frontend and backend builds both pass after that.
- The schema change has now been applied to the local PostgreSQL database with `prisma db push`; the remaining step is runtime endpoint verification.

## 15. AI Coach Runtime Verification (2026-03-02)

- The old API process on port `3000` was stopping Prisma client regeneration by locking `query_engine-windows.dll.node`; stopping and restarting the process resolved it.
- `prisma generate` now succeeds normally again, the backend is restarted on `3000`, and runtime smoke checks pass.
- Verified behavior: authenticated `assessment`, `progress`, `intake`, and `first-plan` endpoints respond; `trainingDaysPerWeek <= 2` is rejected with HTTP `400`.
- Compatibility fix added: legacy `User.currentPhase` values like `A/B/C/D` are normalized into the new `foundation/build/cut/maintain` stage contract.

## 16. AI Coach Profile Engine (2026-03-02)

- Added persistent profile models in Prisma: `AiCoachProfile` (latest profile) and `AiCoachProfileSnapshot` (history archive), and added `AiCoachIntake.extraAnswers` to absorb future form payloads.
- Extended `rightnow-api/src/ai-coach/ai-coach.module.ts` with:
  - profile generation logic (fitness/hydration/meal recommendations),
  - `GET /api/ai-coach/profile`,
  - `POST /api/ai-coach/profile/refresh`,
  - scheduler-based auto refresh every 6 hours.
- Extended frontend API contract only at type/API layer (`api/ai-coach.ts`, `api/index.ts`) without changing any UI component or style.
- Verified locally on `http://localhost:3000`: profile generation works, manual refresh increments `profileVersion`, and intake hard rejection rule remains effective.

## 17. AI Chat Re-entry Fix (2026-03-02)

- Fixed repeat-intake bug in `views/AIChat.tsx`: after user has already completed intake/plan creation, re-entering coach now checks backend progress and goes directly to existing first-day plan instead of asking intake again.
- The fix is logic-only and does not modify component styles or visual layout classes.

## 18. AI Chat Feedback Fix (2026-03-02)

- Fixed Gemini chat 404 resilience in `services/gemini.ts` by adding model fallback (`gemini-2.0-flash` -> `gemini-1.5-flash-latest` -> `gemini-3-flash-preview`) when model-not-found occurs.
- Updated free chat behavior in `views/AIChat.tsx`: prompt now explicitly requires concise responses and a post-processor removes `*` and hard-limits assistant replies to 100 characters.
- Scope is minimal and logic-only; no UI style/layout changes were introduced.

## 19. Gemini 503 Resilience Fix (2026-03-02)

- Updated `services/gemini.ts` request fallback to treat transient HTTP statuses (`429/500/502/503/504`) as retryable.
- Added short per-model retry (`2` attempts with incremental backoff) before switching to the next chat model candidate.
- This prevents one temporary `503 Service Unavailable` from immediately surfacing as a hard chat failure in Evolution Engine text refinement.
- Verified frontend integrity with `npm run build` at repo root.

## 24. AI Coach Intake 500 + Loop Fix (2026-03-03)

- Root cause confirmed: local PostgreSQL table `AiCoachIntake` was behind current Prisma schema, missing columns including `equipmentList`, `trainingEnvironment`, `timePreference`, and diet fields. This caused `POST /api/ai-coach/intake` and `POST /api/ai-coach/first-plan` (prepare) to fail with HTTP `500`.
- Local DB was synced using `npm --prefix rightnow-api run prisma:push`.
- Backend hardening in `rightnow-api/src/ai-coach/ai-coach.module.ts`:
  - added `CoachIntakeInput` typing,
  - added `buildIntakeExtraAnswers(...)`,
  - added `getIntakeCompat(...)` minimal select read path.
- Frontend flow fix in `views/AIChat.tsx`:
  - removed error-time loop-back to `intake-frequency`,
  - on backend failure, fallback to a safe local first-day plan and continue onboarding flow.

## 25. Coach-Build Portrait KB Skeleton Output (2026-03-03)

- Added reproducible generator script: `scripts/generate_user_portraits_kb.py`.
- Generated deliverable file: `knowledge/user_portraits_kb_coach_build.xml`.
- Output structure follows XML + embedded JSON contract for downstream RAG filling:
  - total portraits: `48` (`P001`-`P048`)
  - each portrait includes full `dimensions_snapshot`
  - each portrait has `6` `knowledge_fill_points` (meal x2, hydration x2, training x2)
  - description length is constrained to `150-200` Chinese chars (actual: `150-168`).
- Edge coverage explicitly included in dimensions: postpartum recovery, 50+, severe rehab, highly busy fragmented schedule, and outdoor-only training profiles.

## 26. Community PRD Consolidation (2026-03-03)

- Consolidated community product requirements into `社区prd/社区PRD_综合版.md` using `社区prd/社区.md` as the core source plus current implementation files.
- The new PRD now aligns vision + current code baseline + API/schema constraints + phased delivery plan for Community, Buddy matching, and Buddy room Lite.
- It also formalizes the integration path from training feedback cards to editable community posting, consistent with `TODO和训练记录PRD.md`.

## 27. Diet Camera PRD Consolidation (2026-03-04)

- Added consolidated product spec `饮食拍照PRD.md` based on Socratic co-creation decisions.
- Locked MVP flow as `AI draft -> editable confirm card -> formal save`, where closing the card discards draft (no write).
- Locked performance/accuracy strategy: single-photo whole-meal recognition, `P95 <= 2s`, launch accuracy `±15%~±20%`, long-term target `±10%`.
- Locked retention lifecycle: keep photo/details/training samples for natural 30-day window, then Beijing-time next-day `12:00` batch cleanup; preserve read-only daily nutrition aggregates only.
