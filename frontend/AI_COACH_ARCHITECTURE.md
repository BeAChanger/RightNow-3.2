# AI 教练模块架构文档

> 本文档是 AI 教练模块的技术架构规范。Antigravity（前端 UI/UX）和 Codex（后端 + 数据层）各自按文档独立执行。
>
> 前置文档：`AI_COACH_FEATURE_SPEC.md`（产品规格）、`AI_COACH_BACKEND_HANDOFF_LITE.md`（后端交接）

---

## Part 1: 协作规则与分工

### 1.1 Antigravity（樊中力）→ 前端 UI/UX

| 交付物 | 文件 |
|--------|------|
| 教练卡片组件（4 个） | `components/coach/AssessmentCard.tsx`、`IntakeQuestion.tsx`、`FirstDayPlanCard.tsx`、`WeekSummaryCard.tsx` |
| AIChat 教练状态机重构 | `views/AIChat.tsx` |
| FloatingAdvisor 教练触发增强 | `components/FloatingAdvisor.tsx` |
| App.tsx 路由 + 状态调整 | `App.tsx` |

### 1.2 Codex → 后端 + 数据层

| 交付物 | 文件 |
|--------|------|
| Prisma 模型（4 个新表） | `rightnow-api/prisma/schema.prisma` |
| NestJS AI Coach 模块 | `rightnow-api/src/ai-coach/ai-coach.module.ts` |
| 模块注册 | `rightnow-api/src/app.module.ts` |
| 前端 API 客户端 | `api/ai-coach.ts` |
| API 导出注册 | `api/index.ts` |
| Gemini 服务扩展 | `services/gemini.ts` |
| 专业知识库（4 个文件） | `knowledge/*.md` |

### 1.3 锁定原则

- **UI 一旦用户确认完美，后端只能适配，不得要求改前端**
- **API 契约为桥梁**：前后端通过 Part 5 定义的精确 API 契约对接
- 前端可以在教练流程中使用 mock 数据先行开发，后端就绪后切换为真实 API

---

## Part 2: 专业知识库架构

### 2.1 阶段 1（当前）：结构化知识文件 + Prompt 注入

创建 `knowledge/` 目录，4 个领域各一个 Markdown 文件：

| 文件 | 内容领域 |
|------|----------|
| `knowledge/nutrition.md` | 营养学：宏量营养素比例、微量元素、TDEE/BMR 计算原理、减脂/增肌饮食原则、中国营养学会 DRIs |
| `knowledge/exercise-science.md` | 运动学：主要肌肉群及训练动作、运动损伤预防、恢复原则、渐进超负荷 |
| `knowledge/training-templates.md` | 训练计划模板：分化训练（PPL/上下肢）、全身训练、新手/中级/高级方案、周期化训练原则 |
| `knowledge/body-metrics.md` | 体测数据与公式：体脂率估算公式、BMI、BMR Mifflin-St Jeor、TDEE 活动系数表、健康减脂/增肌周期计算 |

**权威数据来源**：
- ACSM（美国运动医学会）运动处方指南
- NSCA（美国体能协会）体能训练原则
- 中国营养学会膳食营养素参考摄入量（DRIs）

**数据生成方式**：AI 生成初版 → 用户审核确认权威性和准确性

**嵌入方式**：在 Gemini system prompt 中注入相关知识片段（见 Part 3.4 `COACH_KNOWLEDGE_PROMPT`）

### 2.2 阶段 2（后期预留）：pgvector RAG

利用现有 PostgreSQL 数据库：
- 启用 `pgvector` 扩展
- 知识文档分块 → embedding → 向量存储 → 检索增强生成

**本次只预留接口设计，不实现**。知识库注入函数（`buildKnowledgeContext`）设计为可替换——当前从文件读取，未来切换为向量检索，对外接口不变。

---

## Part 3: Codex 后端交付清单

### 3.1 Prisma Schema（4 个新模型）

在 `rightnow-api/prisma/schema.prisma` 中新增以下模型，并在 `User` 模型中添加一对一关联。

#### AiCoachAssessment — 体测快照

```prisma
model AiCoachAssessment {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  currentBodyFatEstimate Float?       // 当前体脂率预估 (%)
  targetBodyFatEstimate  Float?       // 目标体脂率预估 (%)
  goalDirection          String?      // "cut" | "bulk" | "recomp"
  bmrEstimate            Float?       // 基础代谢 (kcal)
  bmiEstimate            Float?       // BMI
  tdeeEstimate           Float?       // 每日总热量消耗 (kcal)
  timelineWeeksEstimate  Int?         // 理论周期 (周)
  phaseJudgment          String?      // AI 阶段判断文案
  sourceVersion          String   @default("v1") // 推导版本
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### AiCoachCalibration — 用户校准覆盖

```prisma
model AiCoachCalibration {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  currentBodyFatOverride  Float?       // 用户实测体脂率
  targetBodyFatOverride   Float?       // 用户调整后目标体脂率
  bmrOverride             Float?       // InBody 实测 BMR
  notes                   String?      // 补充说明
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### AiCoachIntake — 首批补采

```prisma
model AiCoachIntake {
  id                  String   @id @default(cuid())
  userId              String   @unique
  trainingLevel       String       // "zero" | "beginner" | "intermediate" | "advanced"
  hasLimitations      Boolean  @default(false)
  limitationTags      String[] @default([])   // ["knee", "back", "shoulder", "cardio", "other"]
  limitationNotes     String?
  weeklyTrainingDays  Int          // 3 | 4 | 5  （硬拒 1-2）
  sessionDuration     String       // "15-20" | "30" | "45" | "60+"
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### AiCoachProgress — 教练进度

```prisma
model AiCoachProgress {
  id                        String   @id @default(cuid())
  userId                    String   @unique
  coachDayIndex             Int      @default(1)  // 当前第几天 (1-7)
  consecutiveCompletionDays Int      @default(0)  // 连续完成天数
  lastTodoStatus            String?                // "completed" | "partial" | "skipped"
  firstDayPlan              String?                // JSON — 首日计划快照
  weekSummary               String?                // JSON — 第 7 天总结
  lastPromptAt              DateTime?
  lastUserReplyAt           DateTime?
  lastCheckInAt             DateTime?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  user                      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### User 模型新增关联

在现有 `User` 模型中追加 4 行：

```prisma
  // AI Coach 关联
  aiCoachAssessment   AiCoachAssessment?
  aiCoachCalibration  AiCoachCalibration?
  aiCoachIntake       AiCoachIntake?
  aiCoachProgress     AiCoachProgress?
```

添加到 `fitnessPlans FitnessPlan[]` 后面。

完成后执行：

```bash
cd rightnow-api
npx prisma migrate dev --name add-ai-coach-models
```

### 3.2 NestJS AI Coach 模块（5 个 API 端点）

新建 `rightnow-api/src/ai-coach/ai-coach.module.ts`，遵循项目现有模式（Service + Controller + Module 单文件）。

```typescript
// rightnow-api/src/ai-coach/ai-coach.module.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// ─── Service ─────────────────────────────────────────

@Injectable()
class AiCoachService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取体测报告；若不存在则基于用户基础数据自动生成 */
  async getOrCreateAssessment(userId: string) {
    const existing = await this.prisma.aiCoachAssessment.findUnique({
      where: { userId },
    });
    if (existing) {
      return this.mergeCalibration(existing, userId);
    }

    // 从 User 表获取基础数据，计算推导指标
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const gender = user.gender || 'male';
    const weight = user.weight || 70;
    const height = user.height || 170;
    const age = user.age || 25;

    // Mifflin-St Jeor BMR
    const bmr =
      gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    // BMI
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    // TDEE (默认轻度活动 1.375)
    const activityMultiplier =
      { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[
        user.activityLevel || 'light'
      ] || 1.375;
    const tdee = bmr * activityMultiplier;

    // 体脂率粗估（BMI 法，仅作初始参考）
    const bodyFat =
      gender === 'male'
        ? 1.2 * bmi + 0.23 * age - 16.2
        : 1.2 * bmi + 0.23 * age - 5.4;

    // 目标体脂率（基于体型方向简单映射）
    const goalDirection = this.inferGoalDirection(bodyFat, user.bodyStyle);
    const targetBodyFat =
      goalDirection === 'cut'
        ? Math.max(bodyFat - 5, gender === 'male' ? 10 : 18)
        : goalDirection === 'bulk'
          ? bodyFat
          : Math.max(bodyFat - 3, gender === 'male' ? 12 : 20);

    // 周期估算（每周减脂 0.5-1% 体重 ≈ 每周约减 0.5% 体脂）
    const fatDiff = Math.abs(bodyFat - targetBodyFat);
    const timelineWeeks = Math.max(4, Math.round(fatDiff / 0.5));

    const assessment = await this.prisma.aiCoachAssessment.create({
      data: {
        userId,
        currentBodyFatEstimate: Math.round(bodyFat * 10) / 10,
        targetBodyFatEstimate: Math.round(targetBodyFat * 10) / 10,
        goalDirection,
        bmrEstimate: Math.round(bmr),
        bmiEstimate: Math.round(bmi * 10) / 10,
        tdeeEstimate: Math.round(tdee),
        timelineWeeksEstimate: timelineWeeks,
        phaseJudgment: null, // 由前端调 Gemini 生成
      },
    });

    return this.mergeCalibration(assessment, userId);
  }

  /** 保存用户校准覆盖 */
  async saveCalibration(
    userId: string,
    data: {
      currentBodyFatOverride?: number;
      targetBodyFatOverride?: number;
      bmrOverride?: number;
      notes?: string;
    },
  ) {
    const calibration = await this.prisma.aiCoachCalibration.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    // 重新获取合并后的 assessment
    const assessment = await this.prisma.aiCoachAssessment.findUnique({
      where: { userId },
    });

    if (!assessment) {
      return calibration;
    }

    return this.mergeCalibration(assessment, userId);
  }

  /** 保存首批补采答案 */
  async saveIntake(
    userId: string,
    data: {
      trainingLevel: string;
      hasLimitations: boolean;
      limitationTags?: string[];
      limitationNotes?: string;
      weeklyTrainingDays: number;
      sessionDuration: string;
    },
  ) {
    // 硬拒 1-2 天频率
    if (data.weeklyTrainingDays < 3) {
      throw new BadRequestException(
        '每周训练频率至少需要 3 天才能有效推进你的目标，请重新选择。',
      );
    }

    return this.prisma.aiCoachIntake.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  /** 准备上下文 / 保存首日计划 */
  async handleFirstPlan(
    userId: string,
    body: { mode: 'prepare' } | { mode: 'save'; plan: Record<string, unknown> },
  ) {
    if (body.mode === 'prepare') {
      // 收集所有上下文供前端调 Gemini
      const [user, assessment, calibration, intake] = await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        this.prisma.aiCoachAssessment.findUnique({ where: { userId } }),
        this.prisma.aiCoachCalibration.findUnique({ where: { userId } }),
        this.prisma.aiCoachIntake.findUnique({ where: { userId } }),
      ]);

      // 合并校准值
      const merged = {
        currentBodyFat: calibration?.currentBodyFatOverride ?? assessment?.currentBodyFatEstimate,
        targetBodyFat: calibration?.targetBodyFatOverride ?? assessment?.targetBodyFatEstimate,
        bmr: calibration?.bmrOverride ?? assessment?.bmrEstimate,
        bmi: assessment?.bmiEstimate,
        tdee: assessment?.tdeeEstimate,
        goalDirection: assessment?.goalDirection,
        timelineWeeks: assessment?.timelineWeeksEstimate,
      };

      return {
        user: {
          gender: user.gender,
          height: user.height,
          weight: user.weight,
          age: user.age,
          bodyStyle: user.bodyStyle,
          activityLevel: user.activityLevel,
        },
        assessment: merged,
        intake: intake
          ? {
              trainingLevel: intake.trainingLevel,
              hasLimitations: intake.hasLimitations,
              limitationTags: intake.limitationTags,
              limitationNotes: intake.limitationNotes,
              weeklyTrainingDays: intake.weeklyTrainingDays,
              sessionDuration: intake.sessionDuration,
            }
          : null,
      };
    }

    // mode === 'save'：幂等保存首日计划
    const progress = await this.prisma.aiCoachProgress.findUnique({
      where: { userId },
    });

    if (progress?.firstDayPlan) {
      // 幂等：同一天重复调用返回已有计划
      return { plan: JSON.parse(progress.firstDayPlan), isExisting: true };
    }

    const saved = await this.prisma.aiCoachProgress.upsert({
      where: { userId },
      update: {
        firstDayPlan: JSON.stringify((body as { plan: Record<string, unknown> }).plan),
        coachDayIndex: 1,
      },
      create: {
        userId,
        firstDayPlan: JSON.stringify((body as { plan: Record<string, unknown> }).plan),
        coachDayIndex: 1,
      },
    });

    return { plan: JSON.parse(saved.firstDayPlan!), isExisting: false };
  }

  /** 获取教练进度 */
  async getProgress(userId: string) {
    const progress = await this.prisma.aiCoachProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return { status: 'not_started' };
    }

    return {
      status: 'active',
      coachDayIndex: progress.coachDayIndex,
      consecutiveCompletionDays: progress.consecutiveCompletionDays,
      lastTodoStatus: progress.lastTodoStatus,
      firstDayPlan: progress.firstDayPlan ? JSON.parse(progress.firstDayPlan) : null,
      weekSummary: progress.weekSummary ? JSON.parse(progress.weekSummary) : null,
      lastPromptAt: progress.lastPromptAt,
      lastUserReplyAt: progress.lastUserReplyAt,
      lastCheckInAt: progress.lastCheckInAt,
    };
  }

  // ─── Private Helpers ───

  private inferGoalDirection(
    bodyFat: number,
    bodyStyle?: string | null,
  ): 'cut' | 'bulk' | 'recomp' {
    if (bodyStyle === 'muscular') return 'bulk';
    if (bodyFat > 25) return 'cut';
    if (bodyFat < 15) return 'bulk';
    return 'recomp';
  }

  private async mergeCalibration(
    assessment: {
      id: string;
      userId: string;
      currentBodyFatEstimate: number | null;
      targetBodyFatEstimate: number | null;
      goalDirection: string | null;
      bmrEstimate: number | null;
      bmiEstimate: number | null;
      tdeeEstimate: number | null;
      timelineWeeksEstimate: number | null;
      phaseJudgment: string | null;
      sourceVersion: string;
      createdAt: Date;
      updatedAt: Date;
    },
    userId: string,
  ) {
    const calibration = await this.prisma.aiCoachCalibration.findUnique({
      where: { userId },
    });

    return {
      ...assessment,
      // 校准值优先
      currentBodyFat:
        calibration?.currentBodyFatOverride ?? assessment.currentBodyFatEstimate,
      targetBodyFat:
        calibration?.targetBodyFatOverride ?? assessment.targetBodyFatEstimate,
      bmr: calibration?.bmrOverride ?? assessment.bmrEstimate,
      bmi: assessment.bmiEstimate,
      tdee: assessment.tdeeEstimate,
      goalDirection: assessment.goalDirection,
      timelineWeeks: assessment.timelineWeeksEstimate,
      phaseJudgment: assessment.phaseJudgment,
      hasCalibration: !!calibration,
    };
  }
}

// ─── Controller ──────────────────────────────────────

@Controller('ai-coach')
@UseGuards(JwtAuthGuard)
class AiCoachController {
  constructor(private readonly service: AiCoachService) {}

  @Get('assessment')
  getAssessment(@CurrentUser() user: { sub: string }) {
    return this.service.getOrCreateAssessment(user.sub);
  }

  @Patch('assessment')
  calibrate(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      currentBodyFatOverride?: number;
      targetBodyFatOverride?: number;
      bmrOverride?: number;
      notes?: string;
    },
  ) {
    return this.service.saveCalibration(user.sub, body);
  }

  @Post('intake')
  saveIntake(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      trainingLevel: string;
      hasLimitations: boolean;
      limitationTags?: string[];
      limitationNotes?: string;
      weeklyTrainingDays: number;
      sessionDuration: string;
    },
  ) {
    return this.service.saveIntake(user.sub, body);
  }

  @Post('first-plan')
  firstPlan(
    @CurrentUser() user: { sub: string },
    @Body() body: { mode: 'prepare' } | { mode: 'save'; plan: Record<string, unknown> },
  ) {
    return this.service.handleFirstPlan(user.sub, body);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: { sub: string }) {
    return this.service.getProgress(user.sub);
  }
}

// ─── Module ──────────────────────────────────────────

@Module({
  controllers: [AiCoachController],
  providers: [AiCoachService],
})
export class AiCoachModule {}
```

#### 注册到 AppModule

在 `rightnow-api/src/app.module.ts` 中添加：

```typescript
import { AiCoachModule } from './ai-coach/ai-coach.module';

// imports 数组中追加：
AiCoachModule,
```

### 3.3 前端 API 客户端

新建 `api/ai-coach.ts`：

```typescript
// api/ai-coach.ts
import apiClient from './client';

// ─── Types ───────────────────────────────────────────

export interface CoachAssessment {
  id: string;
  currentBodyFat: number | null;
  targetBodyFat: number | null;
  goalDirection: 'cut' | 'bulk' | 'recomp' | null;
  bmr: number | null;
  bmi: number | null;
  tdee: number | null;
  timelineWeeks: number | null;
  phaseJudgment: string | null;
  hasCalibration: boolean;
  sourceVersion: string;
}

export interface CoachCalibrationInput {
  currentBodyFatOverride?: number;
  targetBodyFatOverride?: number;
  bmrOverride?: number;
  notes?: string;
}

export interface CoachIntakeInput {
  trainingLevel: 'zero' | 'beginner' | 'intermediate' | 'advanced';
  hasLimitations: boolean;
  limitationTags?: string[];
  limitationNotes?: string;
  weeklyTrainingDays: number; // 3 | 4 | 5
  sessionDuration: '15-20' | '30' | '45' | '60+';
}

export interface CoachIntake {
  id: string;
  trainingLevel: string;
  hasLimitations: boolean;
  limitationTags: string[];
  limitationNotes: string | null;
  weeklyTrainingDays: number;
  sessionDuration: string;
}

export interface FirstPlanContext {
  user: {
    gender: string | null;
    height: number | null;
    weight: number | null;
    age: number | null;
    bodyStyle: string | null;
    activityLevel: string | null;
  };
  assessment: {
    currentBodyFat: number | null;
    targetBodyFat: number | null;
    bmr: number | null;
    bmi: number | null;
    tdee: number | null;
    goalDirection: string | null;
    timelineWeeks: number | null;
  };
  intake: {
    trainingLevel: string;
    hasLimitations: boolean;
    limitationTags: string[];
    limitationNotes: string | null;
    weeklyTrainingDays: number;
    sessionDuration: string;
  } | null;
}

export interface FirstDayPlan {
  training: {
    name: string;
    sets: number;
    reps: string;
    duration?: string;
    notes?: string;
  }[];
  nutrition: {
    type: string; // "水" | "早餐" | "午餐" | "晚餐"
    content: string;
    time?: string;
  }[];
  checkin: {
    prompt: string;
  };
}

export interface FirstPlanSaveResult {
  plan: FirstDayPlan;
  isExisting: boolean;
}

export interface CoachProgress {
  status: 'not_started' | 'active';
  coachDayIndex?: number;
  consecutiveCompletionDays?: number;
  lastTodoStatus?: string | null;
  firstDayPlan?: FirstDayPlan | null;
  weekSummary?: Record<string, unknown> | null;
  lastPromptAt?: string | null;
  lastUserReplyAt?: string | null;
  lastCheckInAt?: string | null;
}

// ─── API ─────────────────────────────────────────────

export const aiCoachApi = {
  /** 获取或自动生成体测报告 */
  getAssessment: () =>
    apiClient.get<CoachAssessment>('/api/ai-coach/assessment').then(r => r.data),

  /** 用户校准覆盖 */
  calibrate: (data: CoachCalibrationInput) =>
    apiClient.patch<CoachAssessment>('/api/ai-coach/assessment', data).then(r => r.data),

  /** 保存首批补采答案 */
  saveIntake: (data: CoachIntakeInput) =>
    apiClient.post<CoachIntake>('/api/ai-coach/intake', data).then(r => r.data),

  /** 准备首日计划上下文（供前端调 Gemini） */
  prepareFirstPlan: () =>
    apiClient.post<FirstPlanContext>('/api/ai-coach/first-plan', { mode: 'prepare' }).then(r => r.data),

  /** 保存 Gemini 生成的首日计划 */
  saveFirstPlan: (plan: FirstDayPlan) =>
    apiClient.post<FirstPlanSaveResult>('/api/ai-coach/first-plan', { mode: 'save', plan }).then(r => r.data),

  /** 获取教练进度 */
  getProgress: () =>
    apiClient.get<CoachProgress>('/api/ai-coach/progress').then(r => r.data),
};
```

#### 注册到 `api/index.ts`

追加：

```typescript
export { aiCoachApi } from './ai-coach';
export type {
  CoachAssessment,
  CoachCalibrationInput,
  CoachIntakeInput,
  CoachIntake,
  FirstPlanContext,
  FirstDayPlan,
  FirstPlanSaveResult,
  CoachProgress,
} from './ai-coach';
```

### 3.4 Gemini 服务扩展

在 `services/gemini.ts` 中新增以下内容：

#### 教练评估 Prompt

```typescript
export const COACH_ASSESSMENT_PROMPT = `你是 RightNow Fitness 的 AI 体测分析师。
根据用户的身体数据和推导指标，给出一段简洁的阶段判断（1-2 句话）。

要求：
- 用专业但有温度的语气
- 明确指出用户当前处于什么阶段（如"初级减脂期"、"体重管理期"、"增肌塑形期"等）
- 给出一句鼓励性判断
- 用中文回答
- 直接返回文字，不要 JSON 或 markdown`;
```

#### 知识库注入 Prompt 构建函数

```typescript
/**
 * 从 knowledge/ 目录读取相关领域知识，构建注入 prompt
 * 当前实现：fetch 静态文件（Vite public 目录或动态 import）
 * 未来可替换为 pgvector RAG 检索
 */
export async function buildKnowledgeContext(
  domains: ('nutrition' | 'exercise' | 'training' | 'metrics')[]
): Promise<string> {
  const domainFileMap: Record<string, string> = {
    nutrition: '/knowledge/nutrition.md',
    exercise: '/knowledge/exercise-science.md',
    training: '/knowledge/training-templates.md',
    metrics: '/knowledge/body-metrics.md',
  };

  const sections: string[] = [];
  for (const domain of domains) {
    try {
      const res = await fetch(domainFileMap[domain]);
      if (res.ok) {
        const text = await res.text();
        // 截取前 2000 字符，避免 prompt 过长
        sections.push(text.slice(0, 2000));
      }
    } catch {
      // 知识文件不可用时静默跳过
    }
  }

  if (sections.length === 0) return '';

  return `\n\n--- 专业知识参考 ---\n${sections.join('\n\n')}\n--- 知识参考结束 ---\n`;
}
```

#### 首日计划生成

```typescript
/**
 * 生成首日行动计划
 * @param context - 从 POST /api/ai-coach/first-plan { mode: 'prepare' } 获取的上下文
 * @returns 解析后的 FirstDayPlan JSON
 */
export async function generateFirstDayPlan(
  context: {
    user: Record<string, unknown>;
    assessment: Record<string, unknown>;
    intake: Record<string, unknown> | null;
  }
): Promise<string> {
  const knowledge = await buildKnowledgeContext(['training', 'nutrition', 'metrics']);

  const systemPrompt = `${FITNESS_COACH_PROMPT}
${knowledge}

你现在要为用户生成首日行动计划。必须返回纯 JSON（不要 markdown 代码块），格式：
{
  "training": [
    { "name": "动作名", "sets": 组数, "reps": "次数或时长", "duration": "可选时长", "notes": "可选提示" }
  ],
  "nutrition": [
    { "type": "水|早餐|午餐|晚餐|加餐", "content": "具体建议", "time": "可选时间" }
  ],
  "checkin": {
    "prompt": "今天训练后的感受打卡提示语"
  }
}

要求：
- 训练动作要具体到组数、次数，可以直接执行
- 根据用户训练基础和时长调整强度
- 如果有伤病限制，避开相关动作并提供替代
- 饮食提醒轻量可执行，不做复杂营养方案
- 打卡提示语要有温度、有鼓励感`;

  const userPrompt = `用户数据：
${JSON.stringify(context, null, 2)}

请生成今日行动计划。`;

  return chatWithGemini(userPrompt, systemPrompt);
}
```

#### 7 天跟进消息

```typescript
/**
 * 生成教练跟进消息（第 2-7 天）
 */
export async function generateCoachFollowUp(
  dayIndex: number,
  context: {
    consecutiveCompletionDays: number;
    lastTodoStatus: string | null;
    userName?: string;
  }
): Promise<string> {
  const knowledge = await buildKnowledgeContext(['exercise', 'training']);

  const tone = dayIndex <= 3 ? '更主动、更有引导感' : '根据完成情况智能调整语气';

  const systemPrompt = `${FITNESS_COACH_PROMPT}
${knowledge}

你现在是第 ${dayIndex} 天的教练跟进。
语气要求：${tone}

规则：
- 如果用户连续完成了多天，给予认可和鼓励
- 如果用户昨天没练，先用搭子式轻调侃拉回来，再给替代任务
- 不要施压，要让用户觉得"今天也可以做到"
- 保持简短（2-3 句话）
- 用中文回答`;

  const userPrompt = `第 ${dayIndex} 天跟进：
- 连续完成天数：${context.consecutiveCompletionDays}
- 上次 TODO 状态：${context.lastTodoStatus || '无记录'}
- 用户名：${context.userName || '用户'}`;

  return chatWithGemini(userPrompt, systemPrompt);
}
```

#### 周总结

```typescript
/**
 * 生成第 7 天周总结
 */
export async function generateWeekSummary(
  context: {
    completedDays: number;
    totalDays: 7;
    userName?: string;
    userFeelings?: string[];
  }
): Promise<string> {
  const systemPrompt = `${FITNESS_COACH_PROMPT}

你现在要生成第一周总结。这个总结必须围绕"成就感"设计。

必须返回纯 JSON（不要 markdown 代码块），格式：
{
  "completionRate": "完成率文案，如 7 天中完成了 5 天",
  "highlights": ["成就亮点1", "成就亮点2"],
  "coachMessage": "教练认可和鼓励的话（2-3 句）",
  "nextWeekTeaser": "下周预告（1 句，轻量过渡）"
}

要求：
- 让用户看到自己真的做成了什么
- 让进步变得可感知
- AI 的认可要真诚，不要浮夸
- 在庆祝后轻量过渡到下一周`;

  const userPrompt = `第一周数据：
- 完成天数：${context.completedDays} / ${context.totalDays}
- 用户感受记录：${context.userFeelings?.join('、') || '无'}
- 用户名：${context.userName || '用户'}`;

  return chatWithGemini(userPrompt, systemPrompt);
}
```

### 3.5 知识库文件

在项目根目录创建 `knowledge/` 目录和 4 个结构化 Markdown 文件。初版内容由 AI 基于权威来源生成，用户审核后定稿。

每个文件应遵循统一结构：

```markdown
# [领域名称]

> 数据来源：[权威机构名称]
> 版本：v1 | 日期：YYYY-MM-DD

## 核心概念
...

## 关键数据/公式
...

## 实用指南
...
```

**知识文件部署方式**：放入 `public/knowledge/` 目录，通过 `fetch('/knowledge/xxx.md')` 在前端访问（Vite 会将 public 目录内容原样复制到构建输出）。

---

## Part 4: Antigravity 前端交付清单

### 4.1 教练卡片组件

新建 `components/coach/` 目录，创建以下 4 个组件：

#### AssessmentCard.tsx — 体测报告卡

```typescript
interface AssessmentCardProps {
  assessment: {
    currentBodyFat: number | null;
    targetBodyFat: number | null;
    goalDirection: string | null;
    bmr: number | null;
    bmi: number | null;
    tdee: number | null;
    timelineWeeks: number | null;
    phaseJudgment: string | null;
    hasCalibration: boolean;
  };
  onCalibrate?: () => void; // 点击校准按钮
}
```

展示内容：
- 当前体脂率预估 / 目标体脂率预估
- 目标方向（减脂 / 增肌 / 重塑，用中文标签）
- BMR、BMI、TDEE
- 理论周期（X 周）
- AI 阶段判断文案
- 底部"校准"入口（允许用户后续用 InBody 数据覆盖）
- 如果已校准，显示"已校准"标识

#### IntakeQuestion.tsx — 按钮式问题卡

```typescript
interface IntakeQuestionProps {
  question: string;          // 问题文案
  options: {
    label: string;
    value: string;
    description?: string;
  }[];
  multiSelect?: boolean;     // 伤病标签支持多选
  showTextInput?: boolean;   // 伤病说明输入框
  textPlaceholder?: string;
  onSelect: (value: string | string[], notes?: string) => void;
}
```

可复用于 4 个补采问题：
1. 训练基础 → 4 个单选按钮
2. 伤病/限制 → 2 个按钮 + 展开后多选标签 + 可选文本
3. 每周训练频率 → 4 个按钮（选 1-2 天时触发纠偏 UI）
4. 单次训练时长 → 4 个按钮

#### FirstDayPlanCard.tsx — 首日计划卡

```typescript
interface FirstDayPlanCardProps {
  plan: {
    training: { name: string; sets: number; reps: string; duration?: string; notes?: string }[];
    nutrition: { type: string; content: string; time?: string }[];
    checkin: { prompt: string };
  };
  onCheckIn?: () => void;   // 跳转打卡
}
```

展示内容：
- 训练任务列表（动作名、组数 × 次数、时长、注意事项）
- 饮水/饮食提醒（轻量条目）
- 底部打卡入口按钮

#### WeekSummaryCard.tsx — 第 7 天成就感总结卡

```typescript
interface WeekSummaryCardProps {
  summary: {
    completionRate: string;
    highlights: string[];
    coachMessage: string;
    nextWeekTeaser: string;
  };
}
```

展示内容：
- 完成率（如"7 天中完成了 5 天"）
- 成就亮点列表
- 教练认可与鼓励
- 下周轻量预告

### 4.2 AIChat.tsx 重构

在现有 `views/AIChat.tsx` 基础上重构，增加教练状态机。

#### 教练阶段枚举

```typescript
enum CoachStage {
  IDLE = 'idle',                           // 普通聊天模式
  LOADING = 'loading',                     // 加载体测数据
  ASSESSMENT = 'assessment',               // 展示体测报告卡
  INTAKE_TRAINING = 'intake_training',     // 补采：训练基础
  INTAKE_LIMITATION = 'intake_limitation', // 补采：伤病/限制
  INTAKE_FREQUENCY = 'intake_frequency',   // 补采：每周频率
  INTAKE_DURATION = 'intake_duration',     // 补采：单次时长
  FREQUENCY_REJECT = 'frequency_reject',   // 频率纠偏
  GENERATING = 'generating',               // 生成首日计划中
  FIRST_PLAN = 'first_plan',              // 展示首日计划
  COACHING_ACTIVE = 'coaching_active',     // 教练激活（日常跟进）
  WEEK_SUMMARY = 'week_summary',          // 第 7 天周总结
}
```

#### Props 变更

```typescript
interface Props {
  onBack: () => void;
  authUser?: AuthUser | null;    // 新增：用于获取用户基础信息
  coachTrigger?: boolean;         // 新增：从 FloatingAdvisor 触发教练流程
}
```

#### 核心行为

- `coachTrigger === true` 时，进入教练模式（从 LOADING 开始）
- `coachTrigger === false/undefined` 时，保持普通聊天模式（IDLE）
- 教练模式下：
  - LOADING：调用 `aiCoachApi.getAssessment()`
  - ASSESSMENT：展示 `AssessmentCard`，用户点击"继续"后进入补采
  - 4 个 INTAKE 阶段：逐一展示 `IntakeQuestion`
  - FREQUENCY_REJECT：显示纠偏消息 + 重新选择频率
  - GENERATING：调用 `aiCoachApi.prepareFirstPlan()` → `generateFirstDayPlan()` → `aiCoachApi.saveFirstPlan()`
  - FIRST_PLAN：展示 `FirstDayPlanCard`
  - COACHING_ACTIVE：日常跟进模式
  - WEEK_SUMMARY：展示 `WeekSummaryCard`

### 4.3 FloatingAdvisor.tsx 增强

#### Props 变更

```typescript
interface Props {
  onChatClick?: () => void;
  hasNotification?: boolean;
  currentView?: View;
  coachReady?: boolean;          // 新增：教练流程是否就绪
  onCoachStart?: () => void;     // 新增：触发教练流程
}
```

#### 核心行为

- `coachReady === true` 时：
  - 气泡消息显示教练专属提示语（如"我已经分析了你的数据，点我开始你的教练之旅"）
  - 点击时调用 `onCoachStart()` 而非 `onChatClick()`
- `coachReady === false` 时：保持现有行为

### 4.4 App.tsx 调整

#### 新增状态

```typescript
const [coachTrigger, setCoachTrigger] = useState(false);
```

#### AIChat 路由修改

```typescript
case View.AIChat:
  return (
    <AIChat
      onBack={() => {
        setCoachTrigger(false);
        setCurrentView(View.Dashboard);
      }}
      authUser={authUser}
      coachTrigger={coachTrigger}
    />
  );
```

#### FloatingAdvisor 修改

```typescript
<FloatingAdvisor
  currentView={currentView}
  hasNotification={hasUnreadAI}
  coachReady={hasUnreadAI}  // 当进化引擎完成后触发教练就绪
  onCoachStart={() => {
    setHasUnreadAI(false);
    setCoachTrigger(true);
    setCurrentView(View.AIChat);
  }}
  onChatClick={() => {
    setHasUnreadAI(false);
    setCoachTrigger(false);
    setCurrentView(View.AIChat);
  }}
/>
```

---

## Part 5: API 契约精确定义

### 5.1 GET /api/ai-coach/assessment

获取或自动生成体测报告。

**Request**: 无 body（从 JWT token 获取 userId）

**Response 200**:

```typescript
{
  id: string;
  userId: string;
  currentBodyFat: number | null;     // 校准值优先
  targetBodyFat: number | null;      // 校准值优先
  goalDirection: "cut" | "bulk" | "recomp" | null;
  bmr: number | null;                // 校准值优先
  bmi: number | null;
  tdee: number | null;
  timelineWeeks: number | null;
  phaseJudgment: string | null;
  hasCalibration: boolean;
  sourceVersion: string;
  createdAt: string;                 // ISO 8601
  updatedAt: string;
}
```

**行为**：如果该用户没有 assessment 记录，自动基于 User 表数据计算并创建。

### 5.2 PATCH /api/ai-coach/assessment

用户校准覆盖 AI 推断值。

**Request Body**:

```typescript
{
  currentBodyFatOverride?: number;   // 实测体脂率
  targetBodyFatOverride?: number;    // 调整后目标体脂率
  bmrOverride?: number;              // InBody 实测 BMR
  notes?: string;                    // 补充说明
}
```

**Response 200**: 同 GET /assessment 的响应格式（合并校准后）

### 5.3 POST /api/ai-coach/intake

保存首批补采答案。

**Request Body**:

```typescript
{
  trainingLevel: "zero" | "beginner" | "intermediate" | "advanced";
  hasLimitations: boolean;
  limitationTags?: string[];         // ["knee", "back", "shoulder", "cardio", "other"]
  limitationNotes?: string;
  weeklyTrainingDays: number;        // 必须 >= 3
  sessionDuration: "15-20" | "30" | "45" | "60+";
}
```

**Response 200**:

```typescript
{
  id: string;
  trainingLevel: string;
  hasLimitations: boolean;
  limitationTags: string[];
  limitationNotes: string | null;
  weeklyTrainingDays: number;
  sessionDuration: string;
  createdAt: string;
  updatedAt: string;
}
```

**Response 400**（频率不足）:

```typescript
{
  statusCode: 400,
  message: "每周训练频率至少需要 3 天才能有效推进你的目标，请重新选择。"
}
```

### 5.4 POST /api/ai-coach/first-plan

两种模式：准备上下文 / 保存计划。

#### Mode: prepare

**Request Body**: `{ "mode": "prepare" }`

**Response 200**:

```typescript
{
  user: {
    gender: string | null;
    height: number | null;
    weight: number | null;
    age: number | null;
    bodyStyle: string | null;
    activityLevel: string | null;
  };
  assessment: {
    currentBodyFat: number | null;
    targetBodyFat: number | null;
    bmr: number | null;
    bmi: number | null;
    tdee: number | null;
    goalDirection: string | null;
    timelineWeeks: number | null;
  };
  intake: {
    trainingLevel: string;
    hasLimitations: boolean;
    limitationTags: string[];
    limitationNotes: string | null;
    weeklyTrainingDays: number;
    sessionDuration: string;
  } | null;
}
```

#### Mode: save

**Request Body**:

```typescript
{
  "mode": "save",
  "plan": {
    "training": [...],
    "nutrition": [...],
    "checkin": { "prompt": "..." }
  }
}
```

**Response 200**:

```typescript
{
  plan: { training: [...], nutrition: [...], checkin: {...} };
  isExisting: boolean;   // true = 幂等返回已有计划
}
```

### 5.5 GET /api/ai-coach/progress

获取教练进度状态。

**Request**: 无 body

**Response 200**:

```typescript
{
  status: "not_started" | "active";
  coachDayIndex?: number;              // 1-7
  consecutiveCompletionDays?: number;
  lastTodoStatus?: string | null;
  firstDayPlan?: { training: [...], nutrition: [...], checkin: {...} } | null;
  weekSummary?: { completionRate: string, highlights: string[], ... } | null;
  lastPromptAt?: string | null;
  lastUserReplyAt?: string | null;
  lastCheckInAt?: string | null;
}
```

---

## Part 6: 业务逻辑规则

### 规则 1: 体测公式 — 确定性计算，后端执行

| 指标 | 公式 | 执行位置 |
|------|------|----------|
| BMI | `weight / (height_m)²` | 后端 `AiCoachService` |
| BMR (Mifflin-St Jeor) | 男: `10w + 6.25h - 5a + 5`; 女: `10w + 6.25h - 5a - 161` | 后端 |
| TDEE | `BMR × 活动系数` | 后端 |
| 体脂率粗估 (BMI 法) | 男: `1.2×BMI + 0.23×age - 16.2`; 女: `1.2×BMI + 0.23×age - 5.4` | 后端 |
| 周期估算 | `max(4, round(|当前体脂 - 目标体脂| / 0.5))` 周 | 后端 |

活动系数表：

| activityLevel | 系数 |
|---------------|------|
| sedentary | 1.2 |
| light | 1.375 |
| moderate | 1.55 |
| active | 1.725 |
| very_active | 1.9 |

### 规则 2: 训练频率硬拒绝

- **前端**：选择 1-2 天时，进入 `FREQUENCY_REJECT` 阶段，显示纠偏消息，要求重选
- **后端**：`weeklyTrainingDays < 3` 时返回 `400 Bad Request`
- 双重保障，前后端都必须执行

### 规则 3: 首日计划幂等性

- `POST /api/ai-coach/first-plan { mode: 'save' }` 同一天重复调用返回已有计划
- 通过 `AiCoachProgress.firstDayPlan` 是否已有值来判断
- 返回 `{ isExisting: true }` 标识

### 规则 4: Gemini 调用在前端

- 后端只负责准备上下文（`mode: 'prepare'`）
- 前端拿到上下文后调用 `generateFirstDayPlan()`、`generateCoachFollowUp()`、`generateWeekSummary()`
- AI 生成结果再通过 API 保存回后端（`mode: 'save'`）
- 这样做的好处：Gemini API key 只在前端配置，后端无需管理 AI 调用

### 规则 5: 校准覆盖合并

- 后端返回的 assessment 已经是合并后的值
- 合并逻辑：`calibration.xxxOverride ?? assessment.xxxEstimate`
- `hasCalibration: boolean` 告诉前端是否已有校准数据

### 规则 6: 知识库注入

- 每次 AI 调用都通过 `buildKnowledgeContext()` 注入相关领域知识
- 首日计划：注入 training + nutrition + metrics
- 跟进消息：注入 exercise + training
- 周总结：不需要知识注入（纯总结型）

---

## Part 7: 实施顺序

```
Phase 1: 知识库搭建（Codex）                            [无依赖]
  → 创建 public/knowledge/ 目录和 4 个知识文件
  → 等待用户审核确认

Phase 2: Prisma Schema（Codex）                         [无依赖]
  → 在 schema.prisma 中新增 4 个模型 + User 关联
  → npx prisma migrate dev --name add-ai-coach-models

Phase 3: 后端模块（Codex）                               [依赖 Phase 2]
  → 新建 ai-coach.module.ts（完整 Service + Controller）
  → 注册到 app.module.ts

Phase 4: 前端 API 客户端 + Gemini 扩展（Codex）          [依赖 Phase 3]
  → 新建 api/ai-coach.ts + 注册到 api/index.ts
  → 在 services/gemini.ts 中新增教练相关函数

Phase 5: 前端 UI（Antigravity）                          [可与 Phase 2-4 并行]
  → 新建 components/coach/ 目录和 4 个卡片组件
  → 重构 AIChat.tsx（教练状态机）
  → 增强 FloatingAdvisor.tsx
  → 调整 App.tsx
  → 用户确认 UI 完美后锁定

Phase 6: 前后端集成联调                                   [依赖 Phase 3-5]
  → 前端切换为真实 API
  → 验证完整教练流程
```

---

## 关键文件变更清单

| 文件 | 操作 | 负责方 |
|------|------|--------|
| `AI_COACH_ARCHITECTURE.md` | 新建 | Claude Code |
| `public/knowledge/nutrition.md` | 新建 | Codex（AI 生成 → 用户审核） |
| `public/knowledge/exercise-science.md` | 新建 | Codex |
| `public/knowledge/training-templates.md` | 新建 | Codex |
| `public/knowledge/body-metrics.md` | 新建 | Codex |
| `rightnow-api/prisma/schema.prisma` | 修改 | Codex |
| `rightnow-api/src/ai-coach/ai-coach.module.ts` | 新建 | Codex |
| `rightnow-api/src/app.module.ts` | 修改 | Codex |
| `api/ai-coach.ts` | 新建 | Codex |
| `api/index.ts` | 修改 | Codex |
| `services/gemini.ts` | 修改 | Codex |
| `components/coach/AssessmentCard.tsx` | 新建 | Antigravity |
| `components/coach/IntakeQuestion.tsx` | 新建 | Antigravity |
| `components/coach/FirstDayPlanCard.tsx` | 新建 | Antigravity |
| `components/coach/WeekSummaryCard.tsx` | 新建 | Antigravity |
| `views/AIChat.tsx` | 重构 | Antigravity |
| `components/FloatingAdvisor.tsx` | 修改 | Antigravity |
| `App.tsx` | 修改 | Antigravity |

---

## 验证方式

1. **知识库审核**：用户阅读 `public/knowledge/` 下 4 个文件，确认内容权威准确
2. **后端验证**：`cd rightnow-api && npm run start:dev` → curl 测试 5 个 AI Coach 端点
3. **数据库验证**：`npx prisma studio` 查看 4 个新模型
4. **前端验证**：完成完整教练流程（进化引擎 → 浮动机器人 → 体测报告 → 4 问 → 首日计划）
5. **构建验证**：`npm run build` 无报错
