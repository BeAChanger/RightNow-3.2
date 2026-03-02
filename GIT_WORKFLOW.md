# Git 协作工作流 — RightNow Fitness

## 分支结构

```
main（稳定版，只通过 PR 合入）
└── dev（集成分支，日常合并点）
    ├── feat/evolution-engine  ← Claude + Codex（AI 体型进化）
    ├── feat/ai-chat           ← Claude + Codex（AI 对话）
    ├── feat/diet-camera       ← 技术团队（饮食拍摄 + 卡路里计算）
    ├── feat/community         ← 技术团队（社区功能）
    ├── feat/ui-polish         ← Antigravity（前端 UI/UX 优化）
    └── bugfix/*               ← Codex（Bug 修复）
```

## 角色分工

| 角色 | 分支 | 职责 |
|------|------|------|
| Claude Code | 所有分支 | 架构设计、方案规划、代码审查 |
| Codex | feat/evolution-engine, feat/ai-chat, bugfix/* | 代码实现、Bug 修复 |
| Antigravity | feat/ui-polish | 视觉设计、前端工程化、仓库管理 |
| 技术团队 | feat/diet-camera, feat/community | 饮食拍摄、社区功能开发 |

## 合并流程

```
feature 分支 → PR → dev（集成测试）→ PR → main（稳定发布）
```

1. **功能开发完成** → 在 GitHub 上创建 PR，目标分支为 `dev`
2. **代码审查** → 至少一人 review 通过
3. **dev 测试稳定后** → 创建 PR 合入 `main`
4. **有冲突时** → 在 PR 中解决，不要直接 push 到 dev/main

## Bug 修复流程

1. 从 `dev` 创建 `bugfix/xxx` 分支（如 `bugfix/image-generation`）
2. 修复完成后创建 PR 合入 `dev`
3. 紧急 bug 可直接从 `main` 创建 `hotfix/xxx`，修复后同时合入 `main` 和 `dev`

## 开发前必做

```bash
# 切到你的工作分支
git checkout feat/your-feature

# 同步最新 dev 代码
git pull origin dev
git merge dev
# 或者用 rebase
git pull --rebase origin dev
```

## Codex 配置

- 在 Codex 中连接 GitHub 仓库 `BeAChanger/RightNow-3.2`
- 指定工作分支（如 `feat/ai-chat`）
- Codex 的改动会自动创建 PR

## 技术团队配置

```bash
# 克隆仓库
git clone https://github.com/BeAChanger/RightNow-3.2.git
cd RightNow-3.2

# 切到你的 feature 分支
git checkout feat/diet-camera   # 或 feat/community

# 安装依赖
npm install

# 启动开发
npm run dev
```

## 提交规范

使用 Conventional Commits 格式：

```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 样式调整（不影响逻辑）
refactor: 重构
perf: 性能优化
test: 测试
chore: 构建/工具变更
```

## 注意事项

- `.env.local` 包含 API Key，已在 `.gitignore` 中，**绝不提交**
- `public/assets/model.glb`（69MB）较大，后续考虑迁移到 Git LFS
- 所有 UI 文案必须保持中文
- 前端视觉效果一旦确认，后端必须适配，不得反向要求前端改动
