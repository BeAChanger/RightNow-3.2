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

## 3. Git 协作模式（2026-03-02 建立）

- **仓库**：`BeAChanger/RightNow-3.2`（Private，GitHub）
- **分支策略**：
  - `main` — 稳定版，只通过 PR 合入
  - `dev` — 集成分支，所有 feature 先合到这里
  - `feat/evolution-engine` — Claude + Codex：AI 体型进化
  - `feat/ai-chat` — Claude + Codex：AI 对话
  - `feat/diet-camera` — 技术团队：饮食拍摄 + 卡路里计算
  - `feat/community` — 技术团队：社区功能
  - `feat/ui-polish` — Antigravity：前端 UI/UX 优化
  - `bugfix/*` — Codex：Bug 修复
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
- 规划型任务优先参考 `shared-skills/project-orchestrator/SKILL.md`
- 反馈修复型任务优先参考 `shared-skills/fankui/SKILL.md`
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

---

## 7. 当前待办

- [ ] 本地联调测试（后端 `start:dev` + 前端 `dev`）
- [ ] 注册/登录流程端到端验证
- [ ] Onboarding 数据提交到后端验证
- [ ] 体重、饮食、打卡、进化记录等 API 模块联调

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
- 再判断是否需要使用 `shared-skills/` 下的工作流

在完成有意义的改动后：

- 更新本文件的“最近重要变更 / 当前待办 / 风险与阻塞”相关栏目
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
