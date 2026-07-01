# RightNow AI 教练后端轻量交接文档

## 1. 文档定位

这是一份给 AI 教练模块准备的轻量后端交接文档。

它刻意不是一份很重的技术设计稿。

这个功能当前的推进原则是“前端先行”：

- 先由 Antigravity 把可见的交互方案做出来
- 再由产品视角基于真实前端方案做调整
- 最后由 Claude Code / Codex 贴合已经确认的交互，完成后端映射

这份文档的作用，只是让后端在前端方案尚未完全定型时，保持方向一致、边界清晰，不要过早设计过重。

## 2. 当前阶段的后端角色

Claude Code / Codex 在这一阶段的重点应该是：

- 定义支撑前端流的最小数据结构
- 避免过早引入复杂规则
- 保持 API 和状态设计容易被后续前端迭代调整

当前后端的目标是“支撑前端落地”，不是“提前锁死整套系统”。

## 3. 最小数据对象建议

### 3.1 初始判断快照

用于支撑首次主动触达中的“初始身体判断报告卡”。

建议字段：

- userId
- currentBodyFatEstimate（当前体脂率预估）
- targetBodyFatEstimate（目标体脂率预估）
- goalDirection（目标方向）
- bmrEstimate（基础代谢预估）
- bmiEstimate（BMI 预估）
- tdeeEstimate（TDEE 预估）
- timelineWeeksEstimate（理论周期周数）
- phaseJudgment（阶段判断）
- sourceVersion（推导版本）
- createdAt

### 3.2 校准覆盖

用于用户有更准确的健身房 / InBody 数据时，手动覆盖 AI 推断值。

建议字段：

- userId
- currentBodyFatOverride（当前体脂率覆盖值）
- targetBodyFatOverride（目标体脂率覆盖值）
- notes（补充说明）
- updatedAt

### 3.3 教练建联信息快照

用于存储第一批补采信息。

建议字段：

- userId
- trainingLevel（训练基础）
- hasLimitations（是否有伤病 / 限制）
- limitationTags（限制标签）
- limitationNotes（限制说明）
- weeklyTrainingDays（每周训练天数）
- sessionDuration（单次训练时长）
- createdAt
- updatedAt

### 3.4 教练进度状态

用于驱动首周 7 天节奏。

建议字段：

- userId
- coachDayIndex（当前处于第几天）
- lastPromptAt（上次主动触达时间）
- lastUserReplyAt（上次用户响应时间）
- lastTodoStatus（最近一次 TODO 状态）
- consecutiveCompletionDays（连续完成天数）
- lastCheckInAt（最近一次打卡时间）
- updatedAt

## 4. 最小 API 面建议

这是建议的最小接口面，不是最终锁定版。

### 4.1 初始判断

- `GET /api/ai-coach/assessment`
  - 返回当前用户的推导判断快照

### 4.2 校准

- `PATCH /api/ai-coach/assessment`
  - 保存用户对可编辑推断值的校准覆盖

### 4.3 首批补采

- `POST /api/ai-coach/intake`
  - 保存首次建联的问题答案

### 4.4 首日计划

- `POST /api/ai-coach/first-plan`
  - 生成或返回首日教练输出

### 4.5 进度状态

- `GET /api/ai-coach/progress`
  - 返回首周状态，供前端驱动后续提醒与展示

## 5. 必须保持的产品规则

即便实现保持轻量，下面这些规则也不要被破坏：

- AI 教练应优先使用已有用户数据，再去追问更多信息
- 用户后续应该可以校准 AI 推断值
- 每周训练频率如果选 1-2 天，产品流不能默认静默接受
- 首批补采完成后，必须能立刻产出首日计划
- 第 7 天总结需要有能力引用：
  - 完成次数
  - 用户感受
  - AI 认可语

## 6. 当前不要过早重型设计的部分

现阶段先不要把这些做重：

- 第一周之后的长期教练记忆体系
- 高级营养个性化
- 复杂排期引擎
- 教练人格切换系统
- 覆盖所有分支的重规则引擎

这些都应在前端体验稳定后再进入设计。

## 7. 推荐推进顺序

1. 先等待 Antigravity 交付第一版真实前端方案。
2. 基于真实前端流，删减并确认最终交互路径。
3. 再只实现支撑这条路径所需的最小后端契约。
4. 在前端流稳定前，字段名和 API 形态都应保持可调整。
