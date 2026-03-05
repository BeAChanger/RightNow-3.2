# RightNow Fitness Monorepo 迁移指南

## 迁移完成时间
2026-03-05

## 新的项目位置
`E:/RightNow-Fitness/`

## 项目结构

```
E:/RightNow-Fitness/              # 新的根目录（单个Git仓库）
├── .git/                         # 统一的Git仓库
├── frontend/                     # 前端项目（原 E:\rightnow-fitness (1)）
├── backend/                      # 后端项目（原 E:\RightNow\backend）
├── rag-service/                  # RAG服务（原 E:\fitness-rag-service）
├── docs/                         # 共享文档
│   ├── CLAUDE.md
│   ├── CLAUDE_PROJECT_MEMORY.md
│   └── GIT_WORKFLOW.md
├── .claude/                      # Claude配置（共享）
├── scripts/                      # 共享脚本
│   └── dev.sh
├── package.json                  # 根package.json（workspace配置）
└── README.md                     # 项目总览
```

## 开发者操作指南

### 1. 克隆新仓库
```bash
cd E:/
git clone <repository-url> RightNow-Fitness
cd RightNow-Fitness
```

### 2. 安装依赖
```bash
# 安装所有依赖
npm run install:all

# 或分别安装
cd frontend && npm install
cd ../backend && npm install
cd ../rag-service && pip install -r requirements.txt
```

### 3. 启动服务

**方式一：使用脚本（推荐）**
```bash
bash scripts/dev.sh
```

**方式二：分别启动**
```bash
# 前端 (端口 3000)
npm run dev:frontend

# 后端 (端口 3100)
npm run dev:backend

# RAG 服务 (端口 8000)
npm run dev:rag
```

## Git 工作流变化

### 之前（多仓库）
- 前端：独立仓库
- 后端：独立仓库
- RAG：独立仓库

### 现在（Monorepo）
- 所有代码在一个仓库
- 统一的分支管理
- 统一的PR流程

### 提交规范
```bash
# 前端改动
git commit -m "feat(frontend): 添加新功能"

# 后端改动
git commit -m "fix(backend): 修复bug"

# RAG服务改动
git commit -m "chore(rag): 更新依赖"

# 跨模块改动
git commit -m "feat: 实现前后端联调功能"
```

## 注意事项

1. **旧项目目录保留**：原始目录暂时保留，确认无误后可删除
2. **环境变量**：检查各服务的 `.env` 文件，确保路径正确
3. **IDE配置**：更新IDE的项目根目录为 `E:/RightNow-Fitness`
4. **文档位置**：所有共享文档现在在 `docs/` 目录

## 优势

✅ 一次clone获取所有代码
✅ 统一的Git仓库管理
✅ 多Agent共享配置和文档
✅ 前后端分离但协同开发
✅ 简化的依赖管理

## Git提交记录

- `5e287c9` - chore: initial monorepo structure
- `e5658a6` - fix: add frontend files properly (not as submodule)

## 下一步

项目重组完成，可以继续实现管理后台功能。
