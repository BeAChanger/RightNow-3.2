# 协作指南

## 团队分工

### 全栈开发者（人类同事）
**负责模块**:
- 饮食拍摄功能 (`DietLog.tsx`, `ActionCenter.tsx`)
- 社区功能 (`Community.tsx`, 打卡系列)

**工作分支**:
- `feat/diet-camera`
- `feat/community`

**参考文档**:
- [饮食拍摄模块](modules/DIET_CAMERA.md)
- [社区模块](modules/COMMUNITY.md)
- [饮食API](api/DIET.md)
- [社区API](api/COMMUNITY.md)

### AI Agent团队

#### Claude Code
- **角色**: 架构设计、方案规划
- **负责**: AI教练、数据看板、架构决策
- **工作分支**: `feat/ai-chat`, `dev`

#### Codex Agent
- **角色**: 代码实现、Bug修复
- **负责**: 具体功能实现、测试编写

#### Antigravity Agent
- **角色**: UI/UX优化
- **工作分支**: `feat/ui-polish`

## 工作流程

### 1. 开始新功能
```bash
# 从dev分支创建功能分支
git checkout dev
git pull origin dev
git checkout -b feat/your-feature-name
```

### 2. 开发前准备
- 阅读对应的模块文档 (`docs/modules/`)
- 查看API文档 (`docs/api/`)
- 了解数据库表结构 (`docs/database/`)
- 查看UI设计规范 (`docs/ui/`)

### 3. 开发过程
- 遵循代码规范（见下文）
- 前后端同步开发
- 及时提交小commit
- 更新相关文档

### 4. 自测
- 功能完整性测试
- 边界情况测试
- 移动端适配测试
- API接口测试

### 5. 提交PR
- 使用PR模板（见下文）
- 关联相关Issue
- 标注文档变更
- 请求代码审查

### 6. 代码审查
- 响应审查意见
- 修改后更新PR
- 获得批准后合并

### 7. 合并流程
```
feat/* → PR → dev → 测试 → PR → main
```

## PR描述模板

```markdown
## 功能描述
简要说明本PR实现的功能

## 变更内容
- [ ] 前端变更
- [ ] 后端变更
- [ ] 数据库变更
- [ ] 文档更新

## 测试情况
- [ ] 本地测试通过
- [ ] API测试通过
- [ ] 移动端适配正常

## 截图/录屏
（如有UI变更，请提供截图）

## 相关文档
- 模块文档: docs/modules/XXX.md
- API文档: docs/api/XXX.md

## 注意事项
（如有需要其他开发者注意的地方）
```

## 代码规范

### 前端规范
- 组件使用 `React.FC<Props>` 类型
- Props接口定义在组件文件顶部
- 文件名: PascalCase (`Dashboard.tsx`)
- 函数名: camelCase + handle前缀 (`handleSubmit`)
- 样式: Tailwind CSS工具类
- 深色主题: 背景 `#030303`, 主色 `#B8FF00`

### 后端规范
- 使用NestJS装饰器
- Service层处理业务逻辑
- Controller层只做路由和参数验证
- 使用Prisma进行数据库操作
- 错误统一使用HttpException

### 数据库规范
- 使用Prisma Schema定义
- 迁移文件命名: `YYYYMMDD_description`
- 必须字段: `id`, `createdAt`, `updatedAt`
- 外键使用 `@relation`

### Git Commit规范
```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具变更
```

## 沟通规范

### 问题反馈格式
```markdown
**问题描述**:
**复现步骤**:
1.
2.
**期望行为**:
**实际行为**:
**环境信息**: 浏览器/设备
**截图**: （如有）
```

### 功能讨论格式
```markdown
**功能名称**:
**使用场景**:
**实现方案**:
**技术难点**:
**需要协作**:
```

## 文档更新要求

### 何时更新文档
- 新增功能 → 更新模块文档和API文档
- 修改接口 → 更新API文档
- 数据库变更 → 更新Schema文档
- UI调整 → 更新设计系统

### 文档更新流程
1. 在PR中说明文档变更
2. 代码审查时一并审查文档
3. 合并代码时同步合并文档

## 常见问题

### Q: 如何本地启动项目？
A: 参考 [本地启动指南](existing/LOCAL_STARTUP_GUIDE.md)

### Q: API接口地址是什么？
A: 开发环境 `http://localhost:3100`

### Q: 如何添加新的数据库表？
A: 修改 `backend/prisma/schema.prisma`，然后运行 `npx prisma migrate dev`

### Q: 前端如何调用后端API？
A: 使用 `fetch` 或 `axios`，参考现有代码

### Q: 遇到问题找谁？
A: 在对应功能分支提Issue，或在团队群讨论
