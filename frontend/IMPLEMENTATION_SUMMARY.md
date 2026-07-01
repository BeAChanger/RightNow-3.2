# TODO + 训练记录功能实现总结

## 已完成的后端工作

### 1. 数据库架构 ✅
- ✅ 扩展 `Todo` 表（添加 `completedSource`, `completedAt`, `metadata`）
- ✅ 扩展 `TrainingRecord` 表（添加 `todayFeeling`, `rawInput`, `structuredData`）
- ✅ 创建 `TrainingSetDetail` 表（训练每组明细）
- ✅ 创建 `AiFeedbackCard` 表（AI 反馈卡片）
- ✅ 扩展 `Post` 表（添加 `sourceType`, `sourceRecordId`, `structuredData`）
- ✅ 数据库已同步（使用 `prisma db push`）

### 2. AI 服务模块 ✅
- ✅ 创建 `src/ai/ai.service.ts`（AI 提取和反馈生成）
- ✅ 创建 `src/ai/ai.module.ts`
- ✅ 实现 `extractTrainingData()` 方法
- ✅ 实现 `generateFeedback()` 方法

### 3. Todos 模块扩展 ✅
- ✅ 实现 `ensureDailyTodos()` 方法（从 AiCoachProfile 读取计划）
- ✅ 实现 `autoComplete()` 方法
- ✅ 添加 `GET /todos/ensure-daily` 端点
- ✅ 添加 `POST /todos/auto-complete` 端点
- ✅ 导出 `TodosService`
- ✅ 更新 `toggle()` 方法支持 `completedSource` 和 `completedAt`

### 4. Training 模块扩展 ✅
- ✅ 注入 `AiService` 和 `TodosService`
- ✅ 重构 `create()` 方法（集成 AI 提取、保存明细、自动完成 TODO、生成反馈卡片）
- ✅ 实现 `generateDailyChange()` 方法
- ✅ 添加 `POST /training/daily-change` 端点
- ✅ 添加 `GET /training/feedback` 端点

### 5. Posts 模块扩展 ✅
- ✅ 实现 `createFromTrainingRecord()` 方法
- ✅ 添加 `POST /posts/from-training` 端点

## API 端点总结

### Todos
- `GET /todos/ensure-daily?date=YYYY-MM-DD` - 确保生成当日 TODO
- `POST /todos/auto-complete` - 自动完成 TODO
  ```json
  { "category": "training", "date": "2026-03-04" }
  ```

### Training
- `POST /training` - 创建训练记录（已扩展）
  ```json
  {
    "description": "深蹲 4组x12次 60kg",
    "todayFeeling": "状态不错",
    "photoUrl": "https://...",
    "date": "2026-03-04"
  }
  ```
  返回：`{ record: {...}, feedbackCard: {...} }`

- `POST /training/daily-change?date=YYYY-MM-DD` - 生成今日变化卡片
- `GET /training/feedback?date=YYYY-MM-DD` - 获取反馈卡片列表

### Posts
- `POST /posts/from-training` - 从训练记录创建帖子
  ```json
  {
    "trainingRecordId": "xxx",
    "content": "今天完成了深蹲训练！",
    "images": ["https://..."],
    "tags": ["训练打卡"]
  }
  ```

## 待完成的前端工作

### 优先级 P0（核心功能）

1. **类型定义**
   - 在 `types.ts` 中添加 `View.TodoList`, `View.TrainingLog`, `View.CommunityShare`

2. **TodoList 组件** (`views/TodoList.tsx`)
   - 展示 TODO 列表
   - 手动完成功能
   - 点击跳转到 TrainingLog

3. **TrainingLog 组件** (`views/TrainingLog.tsx`)
   - 文本输入
   - 语音输入（Web Speech API）
   - 图片上传
   - 提交逻辑
   - AI 反馈卡片展示
   - "生成今日变化"按钮
   - "转发到社区"按钮

4. **CommunityShare 组件** (`views/CommunityShare.tsx`)
   - 内容编辑
   - 图片预览
   - 标签编辑
   - 发布到社区

5. **API 层扩展**
   - `api/todos.ts` 添加 `ensureDaily()` 和 `autoComplete()`
   - `api/training.ts` 添加 `generateDailyChange()` 和 `listFeedbackCards()`
   - `api/posts.ts` 添加 `createFromTraining()`

6. **App.tsx 集成**
   - 导入新组件
   - 添加路由逻辑
   - 添加 `shareData` 状态管理

## 测试建议

### 后端测试
```bash
# 启动后端
cd rightnow-api
npm run start:dev

# 测试端点（需要 JWT token）
curl -X GET http://localhost:3100/todos/ensure-daily?date=2026-03-04 \
  -H "Authorization: Bearer <token>"

curl -X POST http://localhost:3100/training \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"description": "深蹲 4组x12次 60kg", "date": "2026-03-04"}'
```

### 前端测试
```bash
# 启动前端
npm run dev

# 手动测试流程
# 1. 登录后导航到 TodoList
# 2. 点击训练任务 → 提交记录
# 3. 查看反馈 → 转发社区
```

## 注意事项

1. **环境变量**：确保 `.env` 中配置了 `GEMINI_API_KEY`
2. **错误处理**：AI 调用失败时不会阻塞流程，会降级保存原始数据
3. **数据库**：已使用 `prisma db push` 同步，生产环境建议使用 `prisma migrate`
4. **性能**：AI 调用可能需要 2-3 秒，前端需要显示加载状态

## 下一步

1. ANTIGRAVITY 实现前端组件（预计 1 周）
2. 集成测试（预计 2 天）
3. 用户验收测试（预计 1 天）
