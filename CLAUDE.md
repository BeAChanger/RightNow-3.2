# RightNow Fitness 前端

React + TypeScript + Vite 健身应用前端，支持 3D 模型展示、AI 对话、进度追踪和社区功能。

## 技术栈

- React 19.2.4
- TypeScript 5.8.2
- Vite 6.2.0
- Three.js + @react-three/fiber + @react-three/drei (3D 渲染)
- Recharts 3.7.0 (图表)
- Tailwind CSS (样式)
- Google Gemini AI (AI 功能)

## 项目结构

```
├── App.tsx              # 主组件，路由和状态管理
├── index.tsx            # React 入口
├── types.ts             # TypeScript 类型定义
├── views/               # 页面组件
│   ├── Splash.tsx       # 启动页
│   ├── Onboarding.tsx   # 引导页（性别、体型、照片）
│   ├── Dashboard.tsx    # 主页（含 3D 模型）
│   ├── DataDashboard.tsx # 数据统计
│   ├── DietLog.tsx      # 饮食记录
│   ├── WeightRecord.tsx # 体重记录
│   ├── Community.tsx    # 社区
│   ├── AIChat.tsx       # AI 对话
│   ├── EvolutionEngine.tsx    # AI 体型进化
│   ├── EvolutionRecord.tsx    # 进化记录
│   ├── EvolutionProgress.tsx  # 进化进度
│   ├── EvolutionGallery.tsx   # 进化相册
│   ├── CheckInType.tsx  # 打卡类型选择
│   ├── CheckInBody.tsx  # 身体打卡
│   ├── CheckInSuccess.tsx # 打卡成功
│   ├── CheckInShare.tsx # 打卡分享
│   └── ActionCenter.tsx # 拍照/上传中心
├── components/          # 可复用组件
│   ├── BottomNav.tsx    # 底部导航栏
│   ├── FloatingAdvisor.tsx # 悬浮 AI 助手按钮
│   └── Hero3D.tsx       # 3D 模型查看器
└── public/              # 静态资源（图片、3D 模型）
```

## 开发命令

```bash
npm run dev       # 启动开发服务器（端口 3000）
npm run build     # 构建生产版本
npm run preview   # 预览生产构建
```

## 配置

- 开发服务器：端口 3000，host 0.0.0.0
- 后端 API：http://localhost:3100
- 路径别名：`@/*` 映射到项目根目录
- 环境变量：`VITE_GEMINI_API_KEY`（.env.local）

## 路由与导航

使用 enum + useState 实现视图切换（非 React Router）：
- `View` 枚举定义所有页面
- `App.tsx` 中 `currentView` 状态控制当前页面
- 通过 `setCurrentView(View.XXX)` 回调导航
- 用户数据（图片、性别、体型、体重等）在 App.tsx 中提升管理

## 代码规范

- 组件使用 React.FC<Props> 类型
- Props 接口定义在组件文件顶部
- 视图和组件文件名：PascalCase（Dashboard.tsx）
- 事件处理函数：camelCase + handle 前缀（handleSaveWeightRecord）
- 样式：Tailwind CSS 工具类，深色主题（#030303 背景，#B8FF00 主色）
- 图标：Google Material Icons（Outlined & Round）
- UI 语言：中文
- 移动端优先，支持安全区域适配

## Git 协作模式

- **仓库**：`BeAChanger/RightNow-3.2`（Private）
- **分支策略**：`main`（稳定）← `dev`（集成）← `feat/*`（功能）
- **详细规则**：见 `GIT_WORKFLOW.md`
- **合并流程**：feature → PR → dev → PR → main
- **协作角色**：Claude Code（架构）、Codex（实现）、Antigravity（前端/仓库管理）、技术团队（饮食/社区）

## Shared Agent Memory Contract

- `CLAUDE_PROJECT_MEMORY.md` is the canonical repository memory for Claude Code, Codex, and other coding agents.
- Before non-trivial work, read `CLAUDE_PROJECT_MEMORY.md` to recover current architecture, recent decisions, and collaboration preferences.
- After meaningful code or planning changes, update `CLAUDE_PROJECT_MEMORY.md` with concise, dated notes.
- Store durable project knowledge there instead of splitting memory across multiple agent-specific files.
- `.claude/commands/*.md` can be reused as workflow prompts, but project state should still be written back to `CLAUDE_PROJECT_MEMORY.md`.

## 技能系统

- 所有共享技能统一注册在 `SKILL_REGISTRY.md`，Agent 启动时读取即可获得全部可用技能。
- 技能文件统一存放在 `skills/<name>/SKILL.md`（项目级）。
- 4 个核心技能已全局安装到各 Agent 默认路径，跨项目可用。
- `.claude/commands/*.md` 仍可作为详细参考，但技能发现以 `SKILL_REGISTRY.md` 为准。
