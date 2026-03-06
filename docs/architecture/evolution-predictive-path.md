# Evolution Predictive Path - 实施计划

## Context（背景）

### 为什么做这个改动

当前「AI 预测进化之路」页面使用硬编码数据，无法支撑真实用户的连续成长体验。需要升级为可持续激励的"阶段追逐系统"：

1. **用户痛点**：看不到真实进度，缺乏持续动力
2. **产品目标**：提升周上传频次 40%，7日留存 >65%
3. **核心机制**：7阶段渐进解锁，连续2次达标（间隔24h）才能解锁下一阶段

### 用户确认的设计决策

1. **预览图失败** → 显示通用占位图（不阻断用户）
2. **阶段0照片** → 使用 EvolutionEngine 生成的初始理想身材照
3. **AI校准频率** → 每5次上传调用 Gemini 校准体脂率
4. **错误提示** → 混合方案（普通用户友好提示，开发模式显示技术细节）

### 现有架构基础

- **前端**：EvolutionProgress（硬编码7阶段）、EvolutionRecord（上传）
- **后端**：Evolution 模块（基础CRUD）、AI Coach（体脂公式计算）
- **数据库**：EvolutionRecord 表、ImageGenTask 表已存在
- **AI集成**：Gemini API 已集成在 ai.service.ts

---

## 实施方案（最小化改动）

### 核心思路

1. **数据库**：新增2张表（EvolutionStage 阶段定义、EvolutionAssessment 评估记录）
2. **后端**：新增 evolution-stage 模块，复用 AI Coach 体脂计算
3. **前端**：EvolutionProgress 从硬编码改为 API 驱动，保持 UI 布局不变
4. **AI增强**：每5次上传调用 Gemini 校准，失败时降级到公式计算

---

## 关键文件清单

### 后端核心文件（6个）

1. **backend/prisma/schema.prisma**
   - 新增 EvolutionStage 模型（阶段定义）
   - 新增 EvolutionAssessment 模型（评估记录）
   - 更新 User 关系

2. **backend/src/evolution-stage/evolution-stage.module.ts**
   - 新建模块，注册 Service 和 Controller

3. **backend/src/evolution-stage/evolution-stage.service.ts**
   - 核心业务逻辑：initializeStages、getStages、assessUpload、checkUnlock

4. **backend/src/evolution-stage/evolution-stage.controller.ts**
   - API 端点：GET /evolution-stage、POST /evolution-stage/assess/:recordId

5. **backend/src/evolution/evolution.service.ts**
   - 修改 create 方法，上传后触发 assessUpload

6. **backend/src/app.module.ts**
   - 注册 EvolutionStageModule

### 前端核心文件（3个）

7. **frontend/views/EvolutionProgress.tsx**
   - 从硬编码改为调用 evolutionStageApi.list()
   - 动态渲染阶段状态（已解锁/待解锁/锁定）

8. **frontend/views/EvolutionRecord.tsx**
   - 上传后可选调用 evolutionStageApi.assess() 获取评估结果

9. **frontend/api/evolution-stage.ts**
   - 新建 API 客户端：list()、assess()

---

## 实施步骤

### Step 1: 数据库迁移（后端）

**新增 EvolutionStage 和 EvolutionAssessment 表**

在 `backend/prisma/schema.prisma` 末尾添加：

```prisma
model EvolutionStage {
  id              String    @id @default(cuid())
  userId          String
  stageIndex      Int       // 0-6
  targetBodyFat   Float
  title           String
  previewImageUrl String?
  isUnlocked      Boolean   @default(false)
  unlockedAt      DateTime?
  actualImageUrl  String?
  qualifiedCount  Int       @default(0)
  lastQualifiedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, stageIndex])
  @@index([userId, stageIndex])
}

model EvolutionAssessment {
  id                 String   @id @default(cuid())
  userId             String
  recordId           String
  bodyFatEstimate    Float
  geminiBodyFat      Float?
  isGeminiCalibrated Boolean  @default(false)
  assessmentCount    Int
  createdAt          DateTime @default(now())
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([recordId])
}
```

在 User 模型中添加关系：
```prisma
model User {
  // ... 现有字段
  evolutionStages      EvolutionStage[]
  evolutionAssessments EvolutionAssessment[]
}
```

执行迁移：
```bash
cd backend
npx prisma migrate dev --name add_evolution_stage_system
```

---

### Step 2: 创建 evolution-stage 模块（后端）

**文件结构：**
```
backend/src/evolution-stage/
├── evolution-stage.module.ts
├── evolution-stage.service.ts
└── evolution-stage.controller.ts
```

**核心实现要点：**

`evolution-stage.service.ts` 关键方法：
- `initializeStages()` - 首次访问时创建7个阶段
- `getStages()` - 返回阶段列表
- `assessUpload()` - 评估体脂，每5次调用Gemini
- `checkUnlock()` - 检查解锁条件（连续2次达标，间隔24h）

**复用现有功能：**
- 体脂公式：复用 AI Coach 的 BMI 计算和 Jackson-Pollock 公式
- 阶段0照片：从 ImageGenTask 表获取最新完成的生成图
- Gemini API：复用 ai.service.ts 的调用方式

**关键逻辑：**
```typescript
// 解锁判断
if (currentBodyFat <= targetBodyFat && hoursSinceLast >= 24) {
  qualifiedCount++;
  if (qualifiedCount >= 2) {
    // 解锁，用最新上传照片替换预览图
    isUnlocked = true;
    actualImageUrl = latestRecord.imageUrl;
  }
}
```

---

### Step 3: 修改 Evolution 上传流程（后端）

**修改 `backend/src/evolution/evolution.service.ts`：**

在 `create()` 方法中，上传成功后触发评估：

```typescript
async create(userId: string, filename: string) {
  const record = await this.prisma.evolutionRecord.create({
    data: { userId, imageUrl: `/uploads/${filename}` }
  });

  // 异步触发评估，不阻塞上传
  this.stageService.assessUpload(userId, record.id).catch(err => {
    this.logger.warn(`Assessment failed: ${err.message}`);
  });

  return this.mapRecord(record);
}
```

**注册模块：**

在 `backend/src/app.module.ts` 中添加：
```typescript
import { EvolutionStageModule } from './evolution-stage/evolution-stage.module';

@Module({
  imports: [
    // ... 现有模块
    EvolutionStageModule,
  ],
})
```

---

### Step 4: 创建前端 API 客户端

**新建 `frontend/api/evolution-stage.ts`：**

```typescript
import client from './index';

export interface EvolutionStage {
  stageIndex: number;
  targetBodyFat: number;
  title: string;
  previewImageUrl?: string;
  isUnlocked: boolean;
  actualImageUrl?: string;
  qualifiedCount: number;
}

export interface StageListResponse {
  stages: EvolutionStage[];
  currentBodyFat: number;
}

export interface AssessmentResponse {
  bodyFat: number;
  isGeminiCalibrated: boolean;
}

export const evolutionStageApi = {
  async list(): Promise<StageListResponse> {
    const { data } = await client.get<StageListResponse>('/evolution-stage');
    return data;
  },

  async assess(recordId: string): Promise<AssessmentResponse> {
    const { data } = await client.post<AssessmentResponse>(`/evolution-stage/assess/${recordId}`);
    return data;
  }
};
```

---

### Step 5: 改造 EvolutionProgress 组件（前端）

**修改 `frontend/views/EvolutionProgress.tsx`：**

**核心改动：**
1. 从硬编码改为调用 API
2. 保持现有 UI 布局和样式
3. 动态渲染阶段状态

```typescript
import { evolutionStageApi, EvolutionStage } from '../api/evolution-stage';

const EvolutionProgress: React.FC<Props> = ({ onBack, currentFat, targetFat }) => {
  const [stages, setStages] = useState<EvolutionStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      const data = await evolutionStageApi.list();
      setStages(data.stages);
    } catch (error) {
      console.error('Failed to load stages:', error);
    } finally {
      setLoading(false);
    }
  };

  // 渲染逻辑：根据 stage 数据决定显示
  const renderStageCard = (stage: EvolutionStage, position: { top: number; left: number }) => {
    const isGoal = stage.stageIndex === 6;
    const isCurrent = stage.stageIndex === 0;
    const isNextStage = stage.stageIndex === 1;

    // 图片优先级：actualImageUrl > previewImageUrl > 占位图
    const imageUrl = stage.actualImageUrl || stage.previewImageUrl || '/placeholder.png';

    if (isGoal) {
      return <GoalCard image={imageUrl} bodyFat={stage.targetBodyFat} />;
    }

    if (isCurrent) {
      return <CurrentCard image={imageUrl} bodyFat={currentFat} />;
    }

    if (stage.isUnlocked) {
      return <UnlockedCard image={stage.actualImageUrl!} bodyFat={stage.targetBodyFat} />;
    }

    if (isNextStage) {
      return <NextStageCard
        image={imageUrl}
        bodyFat={stage.targetBodyFat}
        qualifiedCount={stage.qualifiedCount}
      />;
    }

    return <LockedCard bodyFat={stage.targetBodyFat} />;
  };

  // 保持现有的 STAGES_CONFIG 位置布局
  const STAGES_CONFIG = [
    { id: 6, top: 120, left: 200 },
    { id: 5, top: 380, left: 100 },
    { id: 4, top: 620, left: 300 },
    { id: 3, top: 880, left: 300 },
    { id: 2, top: 1140, left: 100 },
    { id: 1, top: 1400, left: 100 },
    { id: 0, top: 1650, left: 200 },
  ];

  return (
    <div className="evolution-progress">
      {loading ? (
        <div>加载中...</div>
      ) : (
        STAGES_CONFIG.map(config => {
          const stage = stages.find(s => s.stageIndex === config.id);
          if (!stage) return null;
          return (
            <div key={stage.stageIndex} style={{ top: config.top, left: config.left }}>
              {renderStageCard(stage, config)}
            </div>
          );
        })
      )}
    </div>
  );
};
```

---

### Step 6: 集成上传评估（前端）

**修改 `frontend/views/EvolutionRecord.tsx`：**

在上传成功后，可选调用评估 API 获取结果：

```typescript
import { evolutionStageApi } from '../api/evolution-stage';

const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    try {
      // 1. 上传照片
      const formData = new FormData();
      formData.append('file', file);
      const record = await evolutionApi.create(formData);

      // 2. 可选：获取评估结果（后端已自动触发）
      try {
        const assessment = await evolutionStageApi.assess(record.id);
        if (assessment.isGeminiCalibrated) {
          setInfo(`AI 校准完成，当前体脂率：${assessment.bodyFat}%`);
        }
      } catch (err) {
        console.warn('Assessment failed:', err);
      }

      await loadRecords();
    } catch (err: any) {
      setError(err?.response?.data?.message || '上传失败');
    }
  }
};
```

---

## 验证方法

### 后端验证

**1. 数据库验证**
```bash
cd backend
npx prisma studio
# 检查 EvolutionStage 和 EvolutionAssessment 表是否创建成功
```

**2. API 测试**
```bash
# 获取阶段列表
curl -H "Authorization: Bearer <token>" http://localhost:5000/evolution-stage

# 触发评估
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:5000/evolution-stage/assess/<recordId>
```

**3. 解锁逻辑测试**
- 上传第1张照片 → 检查 qualifiedCount = 1
- 24小时内上传第2张 → qualifiedCount 不变
- 24小时后上传第2张 → qualifiedCount = 2，isUnlocked = true
- 上传不达标照片 → qualifiedCount 重置为 0

### 前端验证

**1. 页面加载**
- 打开 EvolutionProgress 页面
- 检查是否显示7个阶段卡片
- 阶段0显示 EvolutionEngine 生成的照片
- 阶段1显示预览图或占位图
- 阶段2-6显示锁定状态

**2. 上传流程**
- 在 EvolutionRecord 上传照片
- 检查是否触发评估
- 第5次上传时检查是否显示 "AI 校准完成"

**3. 解锁验证**
- 连续2次达标（间隔24h）后
- 检查阶段1是否解锁
- 检查卡片图片是否替换为真实上传照片

### 端到端测试

**完整用户流程：**
1. 用户首次打开 EvolutionProgress → 自动初始化7个阶段
2. 用户上传进度照片 → 触发体脂评估
3. 达标后24小时再上传 → qualifiedCount +1
4. 第2次达标 → 解锁下一阶段，照片替换
5. 重复流程直到阶段6

---

## 关键注意事项

### 最小化原则

1. **复用现有功能**
   - 体脂计算：直接复用 AI Coach 公式
   - Gemini API：复用 ai.service.ts 的调用方式
   - 上传流程：不修改现有 Evolution 模块接口

2. **避免过度设计**
   - 不添加复杂的预览图生成逻辑（失败时用占位图）
   - 不实现解锁动画（MVP 后迭代）
   - 不添加推送通知（MVP 后迭代）

3. **保持 UI 稳定**
   - 保持7阶段卡片布局不变
   - 仅改变数据来源（硬编码 → API）
   - 保持现有样式和动画

### 错误处理

1. **Gemini 校准失败** → 使用公式值，记录日志
2. **预览图生成失败** → 显示占位图
3. **评估失败** → 不阻塞上传，记录错误
4. **并发解锁** → 使用数据库事务保证原子性

### 性能考虑

1. **首次加载** → 异步初始化阶段，不阻塞页面渲染
2. **评估触发** → 异步执行，不阻塞上传响应
3. **Gemini 调用** → 仅每5次上传，控制成本

---

## 实施时间线

**Week 1: 后端核心（3天）**
- Day 1: 数据库迁移 + Service 骨架
- Day 2: 核心逻辑实现（评估、解锁）
- Day 3: API 端点 + 集成测试

**Week 2: 前端集成（3天）**
- Day 1: API 客户端 + EvolutionProgress 改造
- Day 2: EvolutionRecord 集成 + UI 调整
- Day 3: 端到端测试 + Bug 修复

**Week 3: AI 增强 + 优化（2天）**
- Day 1: Gemini 校准集成 + 错误处理
- Day 2: 性能优化 + 最终测试

---

## 成功标准

### 功能完整性
- ✅ 用户首次进入自动初始化7个阶段
- ✅ 每次上传触发体脂评估
- ✅ 连续2次达标（间隔24h）解锁下一阶段
- ✅ 解锁后卡片显示真实上传照片
- ✅ 每5次上传调用 Gemini 校准

### 用户体验
- ✅ UI 布局保持不变
- ✅ 加载速度 <2秒
- ✅ 错误提示友好（混合方案）
- ✅ 预览图失败不阻塞功能

### 技术质量
- ✅ 数据库事务保证解锁原子性
- ✅ 评估失败不影响上传成功
- ✅ 代码复用现有模块
- ✅ 最小化改动范围

---

## 风险缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Gemini API 失败 | 体脂率不准确 | 降级到公式计算 |
| 预览图生成失败 | 无法显示下一阶段 | 使用占位图 |
| 24h 判断错误 | 解锁逻辑混乱 | 单元测试覆盖边界情况 |
| 并发解锁 | 重复解锁 | 数据库事务 + 唯一索引 |
| 现有用户无数据 | 页面空白 | 首次访问自动初始化 |

---

## 后续迭代（MVP 后）

**Phase 2: 体验增强**
- 解锁动画效果
- 推送通知（达标提醒）
- 阶段分享功能
- 历史评估记录查看

**Phase 3: AI 优化**
- 预览图质量提升
- 非线性阶段阈值（前快后慢）
- 多目标体型支持
- 社区对比功能

---

## 总结

这是一个**最小化改动、最大化复用**的实施方案：

✅ **2张新表** - 清晰的数据模型
✅ **1个新模块** - evolution-stage 独立模块
✅ **3个前端文件** - API 客户端 + 2个组件改造
✅ **复用现有功能** - AI Coach 公式、Gemini API、上传流程
✅ **保持 UI 稳定** - 仅改变数据源，不改变布局

预计 **2周完成 MVP**，第3周用于 AI 增强和优化。
