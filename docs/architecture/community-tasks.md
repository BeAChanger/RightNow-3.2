# 社区模块任务清单

**架构计划**: `docs/architecture/community-plan.md`
**创建时间**: 2026-03-05
**状态**: 进行中

---

## Phase 1: 内容闭环（1-1.5 周）

### Codex 后端任务

- [x] **TASK-01**: 数据库迁移 - Post 模型扩展
  - 优先级: High
  - 预估: 30min
  - 验收: `npx prisma db push` 成功
  - 完成时间: 2026-03-05

- [x] **TASK-02**: AI 草稿生成端点 `POST /posts/draft/ai`
  - 优先级: High
  - 预估: 2h
  - 验收: 返回草稿包含训练次数和体重变化
  - 完成时间: 2026-03-05

- [x] **TASK-03**: 训练转发端点 `POST /posts/from-training/:recordId`
  - 优先级: High
  - 预估: 1h
  - 验收: 从训练记录调用成功返回草稿
  - 完成时间: 2026-03-05

- [x] **TASK-04**: 帖子列表 visibility 过滤
  - 优先级: Medium
  - 预估: 30min
  - 验收: `GET /posts?visibility=PUBLIC` 正确过滤
  - 完成时间: 2026-03-05

- [x] **TASK-05**: AI 提示词模板 `community_progress_draft`
  - 优先级: High
  - 预估: 1h
  - 验收: 生成草稿符合进步报告卡格式
  - 完成时间: 2026-03-05

### AntiGravity 前端任务

- [x] **TASK-06**: 进步报告卡组件 `ProgressReportCard.tsx`
  - 优先级: High
  - 预估: 2h
  - 验收: 展示主视觉、AI标题、指标、感受
  - 完成时间: 2026-03-05

- [x] **TASK-07**: AI 草稿确认页 `DraftConfirm.tsx`
  - 优先级: High
  - 预估: 2h
  - 验收: 支持编辑文案、图片、可见范围
  - 完成时间: 2026-03-05

- [x] **TASK-08**: 社区首页升级 - 搭子推荐区占位
  - 优先级: Medium
  - 预估: 1h
  - 验收: 顶部展示推荐区占位符
  - 完成时间: 2026-03-05

- [x] **TASK-09**: 可见范围选择器
  - 优先级: Medium
  - 预估: 30min
  - 验收: 两档选择（PUBLIC/BUDDIES_ONLY）
  - 完成时间: 2026-03-05

---

## Phase 2: 搭子闭环（1 周）

### Codex 后端任务

- [x] **TASK-10**: 搭子推荐端点 `GET /friendships/recommendations`
  - 优先级: High
  - 预估: 3h
  - 验收: 返回 Top 10 推荐按分数排序
  - 完成时间: 2026-03-05

- [x] **TASK-11**: 匹配算法实现（节奏+目标+活跃度）
  - 优先级: High
  - 预估: 2h
  - 验收: 节奏权重60%，目标30%，活跃度10%
  - 完成时间: 2026-03-05

- [x] **TASK-12**: Friendship 模型扩展（matchScore, matchReason）
  - 优先级: Medium
  - 预估: 20min
  - 验收: 迁移成功，推荐时保存匹配信息
  - 完成时间: 2026-03-05

### AntiGravity 前端任务

- [x] **TASK-13**: 搭子推荐页 `BuddyRecommend.tsx`
  - 优先级: High
  - 预估: 2h
  - 验收: 展示 Top 10，支持发起邀请
  - 完成时间: 2026-03-05

- [x] **TASK-14**: 搭子推荐卡组件 `BuddyCard.tsx`
  - 优先级: High
  - 预估: 1.5h
  - 验收: 展示目标、节奏、推荐理由
  - 完成时间: 2026-03-05

- [x] **TASK-15**: 社区首页搭子推荐区实现
  - 优先级: Medium
  - 预估: 1h
  - 验收: 轻量展示，不抢主视觉
  - 完成时间: 2026-03-05

---

## Phase 3: 群聊功能（1 周）

### Codex 后端任务

- [x] **TASK-16**: 数据库迁移 - Group/GroupMember/GroupMessage 模型
  - 优先级: High
  - 预估: 30min
  - 验收: `npx prisma db push` 成功
  - 完成时间: 2026-03-05

- [x] **TASK-17**: 群组管理端点（创建、更新、解散、成员管理）
  - 优先级: High
  - 预估: 3h
  - 验收: 可创建群组、邀请成员、移除成员
  - 完成时间: 2026-03-05

- [x] **TASK-18**: 群消息端点（发送消息、获取历史）
  - 优先级: High
  - 预估: 2h
  - 验收: 可发送消息、分页查询历史消息
  - 完成时间: 2026-03-05

- [x] **TASK-19**: 群组权限控制（Creator/Admin/Member）
  - 优先级: Medium
  - 预估: 1h
  - 验收: 不同角色有不同操作权限
  - 完成时间: 2026-03-05

### AntiGravity 前端任务

- [x] **TASK-20**: 群组列表页 `GroupList.tsx`
  - 优先级: High
  - 预估: 2h
  - 验收: 展示我的群组列表，支持创建群组
  - 完成时间: 2026-03-05

- [x] **TASK-21**: 群聊页面 `GroupChat.tsx`
  - 优先级: High
  - 预估: 3h
  - 验收: 消息列表、发送消息、滚动加载
  - 完成时间: 2026-03-05

- [x] **TASK-22**: 群组设置页 `GroupSettings.tsx`
  - 优先级: Medium
  - 预估: 1.5h
  - 验收: 成员管理、群信息编辑
  - 完成时间: 2026-03-05

---

## 进度统计

- **总任务数**: 22
- **已完成**: 22 (Phase 1: 9, Phase 2: 6, Phase 3: 7)
- **进行中**: 0
- **待开始**: 0

**预估总工时**:
- Codex: ~15h (已完成)
- AntiGravity: ~15h (已完成)
- 总计: ~30h（约 3-4 周，考虑并行执行）

**Phase 1 完成情况**:
- ✅ 数据库迁移完成
- ✅ AI 草稿生成端点实现
- ✅ 训练转发端点实现
- ✅ 帖子列表 visibility 过滤实现
- ✅ AI 提示词模板创建
- ✅ 进步报告卡组件完成
- ✅ AI 草稿确认页完成
- ✅ 社区首页升级完成
- ✅ 可见范围选择器完成

**Phase 2 完成情况**:
- ✅ 搭子推荐端点实现
- ✅ 匹配算法实现
- ✅ Friendship 模型扩展
- ✅ 搭子推荐页完成
- ✅ 搭子推荐卡组件完成
- ✅ 社区首页搭子推荐区实现

**Phase 3 完成情况**:
- ✅ Group/GroupMember/GroupMessage 数据模型创建
- ✅ 群组管理端点实现（创建、更新、解散、成员管理）
- ✅ 群消息端点实现（发送消息、获取历史）
- ✅ 群组权限控制实现（Creator/Admin/Member）
- ✅ 群组列表页完成（GroupList.tsx）
- ✅ 群聊页面完成（GroupChat.tsx）
- ✅ 群组设置页完成（GroupSettings.tsx）
