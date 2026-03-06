# RightNow Fitness (此刻健身)

> **通过 AI 视觉锚点消除反馈延迟，让用户"看见"未来的自己。**
> *Believe is Seeing.*

RightNow Fitness 是一款结合 AI 技术与心理学激励机制的健身应用。我们致力于解决健身过程中最大的痛点——**反馈延迟**。通过 AI 生成用户未来的理想身材模型（Evolution Engine），我们将遥远的"结果"瞬间呈现在用户眼前，提供即时的视觉刺激和动力。

---

## 🎯 项目简介 (What is this?)

这是一个**移动端优先的 H5 健身应用**，核心理念是通过 AI 技术让用户在开始健身前就能"看见"自己未来的样子，从而获得即时的动力反馈。

**核心卖点**：
- 🧬 AI 生成你未来的理想身材
- 📊 全面的数据追踪与分析
- 🎮 游戏化的打卡与成就系统
- 👥 用户社区与真实案例分享

---

## 📱 核心功能 (Key Features)

### 1. 🧬 Evolution Engine (进化引擎)
- **AI 视觉锚点**：基于用户的体测数据和上传的照片，生成 3D 进化模型。
- **实时对比**：通过滑块交互，直观对比 "Now" (现在) 与 "Future" (未来) 的状态。
- **共创调整**：支持通过自然语言（如"我想肩膀更宽一点"）与 AI 对话，实时微调目标模型。

### 2. 📊 智能数据看板 (Smart Dashboard)
- **全维度数据**：追踪体重、体脂、围度变化及热量消耗。
- **活动热力图**：可视化展示每月的训练频率与强度。
- **Floating Advisor**：悬浮 AI 顾问，根据当日缺口主动推送饮食与训练建议。

### 3. 🏁 沉浸式打卡 (Immersive Check-in)
- **多模式支持**：涵盖力量、有氧、瑜伽等多种运动类型。
- **可视化反馈**：打卡完成后即时展示成就卡片与身体数据变化。
- **身体档案**：结合尺规交互的精细化围度记录体验。

### 4. 👥 互助社区 (Community)
- **真实蜕变**：展示用户的 Before & After 视觉对比。
- **Tag 聚合**：基于训练目标（如#减脂、#增肌）的话题聚合。

### 5. 🥗 饮食记录 (Diet Log)
- **拍照识别**：通过视觉识别快速记录热量（目前为模拟数据）。
- **宏量营养素分析**：自动计算碳水、蛋白质、脂肪的摄入比例。

---

## 🛠 技术栈 (Tech Stack)

| 类别 | 技术 |
|------|------|
| **Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 6 |
| **3D Rendering** | Three.js + React Three Fiber |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS (Dark Mode) |

---

## 📂 项目结构 (Structure)

```bash
rightnow-fitness/
├── components/         # 可复用组件
│   ├── BottomNav.tsx     # 底部导航栏
│   ├── FloatingAdvisor.tsx # 悬浮 AI 顾问
│   └── ...
├── views/              # 页面级组件
│   ├── Dashboard.tsx     # 主页仪表盘
│   ├── EvolutionEngine.tsx # 进化引擎
│   ├── Community.tsx     # 社区页面
│   ├── DietLog.tsx       # 饮食记录
│   └── ...
├── App.tsx             # 根组件与路由逻辑
├── index.tsx           # 入口文件
├── types.ts            # TypeScript 类型定义
├── index.html          # HTML 模板
├── vite.config.ts      # Vite 配置
└── package.json        # 项目依赖
```

---

## 🚀 本地运行流程 (Getting Started)

### 前置要求
- **Node.js** 16+ (推荐使用 LTS 版本)
- **npm** 或 **yarn** 包管理器

### 安装与运行

#### 1️⃣ 克隆项目
```bash
git clone https://github.com/YOUR_USERNAME/rightnow-fitness.git
cd rightnow-fitness
```

#### 2️⃣ 安装依赖
```bash
npm install
```

#### 3️⃣ 启动开发服务器
```bash
npm run dev
```

#### 4️⃣ 访问应用
打开浏览器访问 **http://localhost:5173**

> 💡 **提示**：推荐使用浏览器的开发者工具切换到"手机模式"以获得最佳体验。

---

## 📋 可用脚本 (Available Scripts)

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (热重载) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

---

## ⚠️ 注意事项 (Notes)

- **API Key**: 真实 AI 能力（对话、图像生成）依赖 Gemini API，缺少 key 时会返回提示信息。
- **移动端适配**: 项目专为移动端 Web (H5) 优化，建议在浏览器中使用"手机模式"或在手机上访问以获得最佳体验。
- **环境变量**: 前端在 `.env.local` 设置 `VITE_GEMINI_API_KEY`，后端在 `backend/.env` 设置 `GEMINI_API_KEY`。
- **模型策略**: 见 `../docs/AI_MODEL_POLICY.md`。

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 和 Pull Request！

---

*RightNow Fitness - Believe is Seeing.* 🏋️‍♂️✨

