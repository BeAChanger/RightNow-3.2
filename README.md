# RightNow Fitness (此刻健身)

> **通过 AI 视觉锚点消除反馈延迟，让用户“看见”未来的自己。**
> *Believe is Seeing.*

RightNow Fitness 是一款结合 AI 技术与心理学激励机制的健身应用。我们致力于解决健身过程中最大的痛点——**反馈延迟**。通过 AI 生成用户未来的理想身材模型（Evolution Engine），我们将遥远的“结果”瞬间呈现在用户眼前，提供即时的视觉刺激和动力。

---

## 📱 核心功能 (Key Features)

### 1. 🧬 Evolution Engine (进化引擎)
- **AI 视觉锚点**：基于用户的体测数据和上传的照片，生成 3D 进化模型。
- **实时对比**：通过滑块交互，直观对比 "Now" (现在) 与 "Future" (未来) 的状态。
- **共创调整**：支持通过自然语言（如“我想肩膀更宽一点”）与 AI 对话，实时微调目标模型。

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
- **拍照识别**：虽然目前为模拟数据，旨在通过视觉识别快速记录热量。
- **宏量营养素分析**：自动计算碳水、蛋白质、脂肪的摄入比例。

---

## 🛠 技术栈 (Tech Stack)

本项目采用现代前端技术构建，注重性能与交互体验：

- **Core**: React 19, TypeScript
- **Styling**: Tailwind CSS (Dark Mode privileged)
- **Visualization**: Recharts (数据图表)
- **Icons**: Material Icons (Round & Outlined)
- **Build/Module System**: ES Modules (via Importmap & CDN)

---

## 📂 项目结构 (Structure)

```bash
.
├── components/       # 可复用组件 (BottomNav, FloatingAdvisor 等)
├── views/            # 页面级组件 (Dashboard, EvolutionEngine, Onboarding 等)
├── types.ts          # TypeScript 类型定义
├── App.tsx           # 根组件与路由逻辑
├── index.tsx         # 入口文件
├── index.html        # HTML 模板与 Tailwind 配置
└── metadata.json     # 权限配置
```

---

## 🚀 本地部署流程 (Local Deployment)

由于本项目使用了浏览器原生的 ES Modules (`importmap`) 和 CDN 依赖，您不需要复杂的构建步骤（如 Webpack 或 Vite 配置）即可快速预览，但必须使用本地服务器以避免 CORS 问题。

### 前置要求
- Node.js (推荐 v16+) 或 Python 环境

### 启动方式

#### 方法 A: 使用 `serve` (推荐)

1. 在项目根目录下打开终端。
2. 如果未安装 `serve`，可以直接使用 npx 运行：
   ```bash
   npx serve .
   ```
3. 打开浏览器访问控制台输出的地址（通常是 `http://localhost:3000`）。

#### 方法 B: 使用 Python

1. 在项目根目录下打开终端。
2. 运行内置 HTTP 服务器：
   ```bash
   # Python 3.x
   python -m http.server 8000
   ```
3. 打开浏览器访问 `http://localhost:8000`。

#### 方法 C: VS Code Live Server

1. 在 VS Code 中安装 "Live Server" 扩展。
2. 右键点击 `index.html`，选择 "Open with Live Server"。

---

## ⚠️ 注意事项

- **API Key**: 这里的 AI 功能（如对话、图像生成）目前为前端模拟展示（Mock Data），无需配置真实的 OpenAI/Gemini API Key 即可体验完整交互流程。
- **移动端适配**: 项目专为移动端 Web (H5) 优化，建议在浏览器中使用“手机模式”或在手机上访问以获得最佳体验。

---

*RightNow Fitness - Believe is Seeing.*
