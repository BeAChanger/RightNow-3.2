import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

type GoalDirection = 'fat_loss' | 'recomposition' | 'muscle_gain';
type CoachStage = 'foundation' | 'build' | 'cut' | 'maintain';
type CoachTaskCategory = 'training' | 'nutrition' | 'recovery' | 'habit';

interface CoachAssessmentResponse {
  id: string;
  bodyFatEstimate?: number | null;
  targetBodyFatEstimate?: number | null;
  bmi: number;
  bmr: number;
  tdee: number;
  goalDirection: GoalDirection;
  targetWeeks: number;
  stage: CoachStage;
  notes?: string | null;
  isVisualAssessment: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CoachAssessmentPatch {
  bodyFatEstimate?: number | null;
  targetBodyFatEstimate?: number | null;
  bmi?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  goalDirection?: GoalDirection;
  targetWeeks?: number;
  stage?: CoachStage;
  notes?: string;
  isVisualAssessment?: boolean;
}

interface CoachIntakeResponse {
  id: string;
  trainingExperience: string;
  injuryHistory: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  extraAnswers?: Prisma.JsonValue | null;
  createdAt: string;
  updatedAt: string;
}

interface CoachTask {
  id: string;
  title: string;
  category: CoachTaskCategory;
  detail: string;
  completed?: boolean;
}

interface CoachPlan {
  headline: string;
  tasks: CoachTask[];
  nutritionNote: string;
  recoveryNote: string;
  coachMessage: string;
}

interface CoachProgressResponse {
  dayIndex: number;
  streakDays: number;
  completedTasks: number;
  totalTasks: number;
  activePlan?: CoachPlan | null;
  weekSummaryReady: boolean;
}

interface CoachProfilePlan {
  generatedAt: string;
  totalCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  weeklyTrainingPlan: Array<{
    day: number;
    focus: string;
    durationMinutes: number;
    tasks: string[];
  }>;
}

interface HydrationPlan {
  generatedAt: string;
  dailyTargetMl: number;
  schedule: Array<{ time: string; amountMl: number; note?: string }>;
}

interface MealPlan {
  generatedAt: string;
  dailyCalories: number;
  meals: Array<{
    name: string;
    time: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    suggestions: string[];
  }>;
}

interface CoachProfileResponse {
  userId: string;
  profileVersion: number;
  recommendationSummary: string | null;
  refreshReason: string | null;
  lastRefreshedAt: string;
  nextRefreshAt: string;
  assessmentSnapshot: Prisma.JsonValue;
  intakeSnapshot: Prisma.JsonValue | null;
  fitnessPlan: CoachProfilePlan;
  hydrationPlan: HydrationPlan;
  mealPlan: MealPlan;
}

interface ProfileRefreshBatchResult {
  targetUsers: number;
  refreshedUsers: number;
  failedUsers: number;
  durationMs: number;
}

@Injectable()
class AiCoachService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateBmi(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    if (!heightM) {
      return 0;
    }
    return Number((weightKg / (heightM * heightM)).toFixed(1));
  }

  private calculateBmr(gender: string | null, weightKg: number, heightCm: number, age: number): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(base + (gender === 'female' ? -161 : 5));
  }

  private estimateBodyFat(gender: string | null, bmi: number, age: number): number {
    const maleFactor = gender === 'female' ? 0 : 1;
    const estimate = 1.2 * bmi + 0.23 * age - 10.8 * maleFactor - 5.4;
    return Number(Math.max(8, Math.min(45, estimate)).toFixed(1));
  }

  private resolveGoalDirection(bodyStyle?: string | null): GoalDirection {
    if (bodyStyle === 'muscular') {
      return 'muscle_gain';
    }
    if (bodyStyle === 'athletic') {
      return 'recomposition';
    }
    return 'fat_loss';
  }

  private resolveStage(goalDirection: GoalDirection): CoachStage {
    if (goalDirection === 'muscle_gain') {
      return 'build';
    }
    if (goalDirection === 'fat_loss') {
      return 'cut';
    }
    return 'foundation';
  }

  private normalizeStage(value: string | null | undefined, goalDirection: GoalDirection): CoachStage {
    switch (value) {
      case 'foundation':
      case 'build':
      case 'cut':
      case 'maintain':
        return value;
      case 'A':
        return 'foundation';
      case 'B':
        return 'build';
      case 'C':
        return 'cut';
      case 'D':
        return 'maintain';
      default:
        return this.resolveStage(goalDirection);
    }
  }

  private resolveTargetWeeks(goalDirection: GoalDirection): number {
    if (goalDirection === 'muscle_gain') {
      return 24;
    }
    if (goalDirection === 'fat_loss') {
      return 16;
    }
    return 12;
  }

  private parsePlanJson(value: Prisma.JsonValue | null): CoachPlan | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as unknown as CoachPlan;
  }

  private mapAssessment(
    assessment: {
      id: string;
      bodyFatEstimate: number | null;
      targetBodyFatEstimate: number | null;
      bmi: number;
      bmr: number;
      tdee: number;
      goalDirection: string;
      targetWeeks: number;
      stage: string;
      notes: string | null;
      isVisualAssessment: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    calibration?: {
      bodyFatEstimate: number | null;
      targetBodyFatEstimate: number | null;
      bmi: number | null;
      bmr: number | null;
      tdee: number | null;
      goalDirection: string | null;
      targetWeeks: number | null;
      stage: string | null;
      notes: string | null;
      updatedAt: Date;
    } | null,
  ): CoachAssessmentResponse {
    const goalDirection = (calibration?.goalDirection ?? assessment.goalDirection) as GoalDirection;
    return {
      id: assessment.id,
      bodyFatEstimate: calibration?.bodyFatEstimate ?? assessment.bodyFatEstimate,
      targetBodyFatEstimate: calibration?.targetBodyFatEstimate ?? assessment.targetBodyFatEstimate,
      bmi: calibration?.bmi ?? assessment.bmi,
      bmr: calibration?.bmr ?? assessment.bmr,
      tdee: calibration?.tdee ?? assessment.tdee,
      goalDirection,
      targetWeeks: calibration?.targetWeeks ?? assessment.targetWeeks,
      stage: this.normalizeStage(calibration?.stage ?? assessment.stage, goalDirection),
      notes: calibration?.notes ?? assessment.notes,
      isVisualAssessment: assessment.isVisualAssessment,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: (calibration?.updatedAt ?? assessment.updatedAt).toISOString(),
    };
  }

  private buildHydrationPlan(weightKg: number): HydrationPlan {
    const baseline = Math.round(weightKg * 35);
    const dailyTargetMl = Math.max(1800, Math.min(4500, baseline));
    const slot = Math.round(dailyTargetMl / 7);
    return {
      generatedAt: new Date().toISOString(),
      dailyTargetMl,
      schedule: [
        { time: '07:30', amountMl: slot, note: '晨起补水' },
        { time: '09:30', amountMl: slot },
        { time: '11:30', amountMl: slot },
        { time: '13:30', amountMl: slot },
        { time: '15:30', amountMl: slot },
        { time: '18:00', amountMl: slot },
        { time: '20:30', amountMl: dailyTargetMl - slot * 6, note: '睡前不宜过量' },
      ],
    };
  }

  private buildMacroTarget(goalDirection: GoalDirection, tdee: number, weightKg: number) {
    const calories = goalDirection === 'fat_loss'
      ? tdee - 400
      : goalDirection === 'muscle_gain'
        ? tdee + 250
        : tdee - 120;
    const totalCalories = Math.max(1200, calories);
    const proteinGrams = Math.round(weightKg * 1.8);
    const fatGrams = Math.max(35, Math.round(weightKg * 0.8));
    const carbsGrams = Math.max(
      80,
      Math.round((totalCalories - proteinGrams * 4 - fatGrams * 9) / 4),
    );

    return {
      totalCalories,
      proteinGrams,
      fatGrams,
      carbsGrams,
    };
  }

  private buildWeeklyTraining(
    stage: CoachStage,
    trainingDaysPerWeek: number,
    durationMinutes: number,
  ): CoachProfilePlan['weeklyTrainingPlan'] {
    const focusTemplate = stage === 'build'
      ? ['下肢力量', '上肢推拉', '核心+有氧', '下肢强化', '上肢强化', '代谢循环', '恢复拉伸']
      : stage === 'cut'
        ? ['全身循环', '下肢+有氧', '上肢+有氧', '核心强化', '全身代谢', '低强度有氧', '恢复拉伸']
        : ['基础全身', '轻有氧', '基础全身', '核心灵活性', '全身激活', '轻有氧', '恢复拉伸'];

    const realDays = Math.max(3, Math.min(6, trainingDaysPerWeek || 3));
    const week: CoachProfilePlan['weeklyTrainingPlan'] = [];
    for (let day = 1; day <= 7; day += 1) {
      const trainingDay = day <= realDays;
      week.push({
        day,
        focus: focusTemplate[day - 1] || '恢复拉伸',
        durationMinutes: trainingDay ? durationMinutes : 25,
        tasks: trainingDay
          ? ['热身 8 分钟', '主训练 30-40 分钟', '整理放松 8 分钟']
          : ['轻度步行 20 分钟', '拉伸 10 分钟'],
      });
    }
    return week;
  }

  private buildMealPlan(
    totalCalories: number,
    proteinGrams: number,
    carbsGrams: number,
    fatGrams: number,
  ): MealPlan {
    const breakfast = Math.round(totalCalories * 0.3);
    const lunch = Math.round(totalCalories * 0.35);
    const dinner = totalCalories - breakfast - lunch;
    const pBreakfast = Math.round(proteinGrams * 0.3);
    const pLunch = Math.round(proteinGrams * 0.35);
    const pDinner = proteinGrams - pBreakfast - pLunch;

    return {
      generatedAt: new Date().toISOString(),
      dailyCalories: totalCalories,
      meals: [
        {
          name: '早餐',
          time: '07:30',
          calories: breakfast,
          proteinGrams: pBreakfast,
          carbsGrams: Math.round(carbsGrams * 0.35),
          fatGrams: Math.round(fatGrams * 0.25),
          suggestions: ['鸡蛋/无糖酸奶', '全麦主食', '一份水果'],
        },
        {
          name: '午餐',
          time: '12:30',
          calories: lunch,
          proteinGrams: pLunch,
          carbsGrams: Math.round(carbsGrams * 0.4),
          fatGrams: Math.round(fatGrams * 0.4),
          suggestions: ['高蛋白主菜', '两份蔬菜', '适量主食'],
        },
        {
          name: '晚餐',
          time: '18:30',
          calories: dinner,
          proteinGrams: pDinner,
          carbsGrams: carbsGrams - Math.round(carbsGrams * 0.35) - Math.round(carbsGrams * 0.4),
          fatGrams: fatGrams - Math.round(fatGrams * 0.25) - Math.round(fatGrams * 0.4),
          suggestions: ['蛋白优先', '控制油脂', '晚间减少高糖零食'],
        },
      ],
    };
  }

  private buildRecommendationSummary(
    stage: CoachStage,
    goalDirection: GoalDirection,
    totalCalories: number,
    dailyTargetMl: number,
  ): string {
    const stageText = stage === 'build'
      ? '增肌构建期'
      : stage === 'cut'
        ? '减脂塑形期'
        : stage === 'maintain'
          ? '巩固维持期'
          : '基础适应期';
    const goalText = goalDirection === 'muscle_gain'
      ? '增肌'
      : goalDirection === 'fat_loss'
        ? '减脂'
        : '体态重塑';

    return `当前档案判定为${stageText}，目标方向是${goalText}。建议每日约 ${totalCalories} kcal，饮水 ${dailyTargetMl} ml，按周计划稳定执行并每 24 小时自动刷新。`;
  }

  private mapProfileToResponse(profile: {
    userId: string;
    profileVersion: number;
    recommendationSummary: string | null;
    refreshReason: string | null;
    lastRefreshedAt: Date;
    nextRefreshAt: Date;
    assessmentSnapshot: Prisma.JsonValue;
    intakeSnapshot: Prisma.JsonValue | null;
    fitnessPlan: Prisma.JsonValue;
    hydrationPlan: Prisma.JsonValue;
    mealPlan: Prisma.JsonValue;
  }): CoachProfileResponse {
    return {
      userId: profile.userId,
      profileVersion: profile.profileVersion,
      recommendationSummary: profile.recommendationSummary,
      refreshReason: profile.refreshReason,
      lastRefreshedAt: profile.lastRefreshedAt.toISOString(),
      nextRefreshAt: profile.nextRefreshAt.toISOString(),
      assessmentSnapshot: profile.assessmentSnapshot,
      intakeSnapshot: profile.intakeSnapshot,
      fitnessPlan: profile.fitnessPlan as unknown as CoachProfilePlan,
      hydrationPlan: profile.hydrationPlan as unknown as HydrationPlan,
      mealPlan: profile.mealPlan as unknown as MealPlan,
    };
  }

  private async ensureAssessment(userId: string) {
    const existing = await this.prisma.aiCoachAssessment.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const weight = user.weight ?? 65;
    const height = user.height ?? 170;
    const age = user.age ?? 26;
    const bmi = this.calculateBmi(weight, height);
    const bmr = this.calculateBmr(user.gender ?? null, weight, height, age);
    const tdee = Math.round(bmr * 1.375);
    const goalDirection = this.resolveGoalDirection(user.bodyStyle);
    const stage = this.normalizeStage(user.currentPhase, goalDirection);

    return this.prisma.aiCoachAssessment.create({
      data: {
        userId,
        bodyFatEstimate: this.estimateBodyFat(user.gender ?? null, bmi, age),
        bmi,
        bmr,
        tdee,
        goalDirection,
        targetWeeks: this.resolveTargetWeeks(goalDirection),
        stage,
      },
    });
  }

  async getAssessment(userId: string): Promise<CoachAssessmentResponse> {
    const assessment = await this.ensureAssessment(userId);
    const calibration = await this.prisma.aiCoachCalibration.findUnique({
      where: { userId },
    });
    return this.mapAssessment(assessment, calibration);
  }

  async updateAssessment(userId: string, patch: CoachAssessmentPatch): Promise<CoachAssessmentResponse> {
    await this.ensureAssessment(userId);

    const calibration = await this.prisma.aiCoachCalibration.upsert({
      where: { userId },
      create: {
        userId,
        bodyFatEstimate: patch.bodyFatEstimate ?? null,
        targetBodyFatEstimate: patch.targetBodyFatEstimate ?? null,
        bmi: patch.bmi ?? null,
        bmr: patch.bmr ?? null,
        tdee: patch.tdee ?? null,
        goalDirection: patch.goalDirection ?? null,
        targetWeeks: patch.targetWeeks ?? null,
        stage: patch.stage ?? null,
        notes: patch.notes ?? null,
      },
      update: {
        bodyFatEstimate: patch.bodyFatEstimate ?? undefined,
        targetBodyFatEstimate: patch.targetBodyFatEstimate ?? undefined,
        bmi: patch.bmi ?? undefined,
        bmr: patch.bmr ?? undefined,
        tdee: patch.tdee ?? undefined,
        goalDirection: patch.goalDirection ?? undefined,
        targetWeeks: patch.targetWeeks ?? undefined,
        stage: patch.stage ?? undefined,
        notes: patch.notes ?? undefined,
      },
    });

    if (patch.stage) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentPhase: patch.stage },
      });
    }

    // Mark as visual assessment if provided
    if (patch.isVisualAssessment) {
      await this.prisma.aiCoachAssessment.update({
        where: { userId },
        data: {
          isVisualAssessment: true,
          targetBodyFatEstimate: patch.targetBodyFatEstimate ?? undefined,
        },
      });
    }

    const assessment = await this.ensureAssessment(userId);
    return this.mapAssessment(assessment, calibration);
  }

  async saveIntake(userId: string, body: {
    trainingExperience?: string;
    injuryHistory?: string;
    trainingDaysPerWeek?: number;
    sessionDurationMinutes?: number;
    trainingEnvironment?: string;
    equipmentList?: string[];
    timePreference?: string;
    timePreferenceOther?: string;
    dietPreference?: string;
    dietRestrictions?: string;
    extraAnswers?: Prisma.JsonValue;
  }): Promise<CoachIntakeResponse> {
    const trainingDaysPerWeek = Number(body.trainingDaysPerWeek ?? 0);
    if (trainingDaysPerWeek <= 2) {
      throw new BadRequestException('AI 教练至少要求每周 3 天训练频率。');
    }

    const intake = await this.prisma.aiCoachIntake.upsert({
      where: { userId },
      create: {
        userId,
        trainingExperience: body.trainingExperience?.trim() || '未填写',
        injuryHistory: body.injuryHistory?.trim() || '无',
        trainingDaysPerWeek,
        sessionDurationMinutes: Number(body.sessionDurationMinutes ?? 45),
        trainingEnvironment: body.trainingEnvironment ?? null,
        equipmentList: body.equipmentList ?? [],
        timePreference: body.timePreference ?? null,
        timePreferenceOther: body.timePreferenceOther ?? null,
        dietPreference: body.dietPreference ?? null,
        dietRestrictions: body.dietRestrictions ?? null,
        extraAnswers: body.extraAnswers === undefined
          ? undefined
          : (body.extraAnswers as Prisma.InputJsonValue),
      },
      update: {
        trainingExperience: body.trainingExperience?.trim() || '未填写',
        injuryHistory: body.injuryHistory?.trim() || '无',
        trainingDaysPerWeek,
        sessionDurationMinutes: Number(body.sessionDurationMinutes ?? 45),
        trainingEnvironment: body.trainingEnvironment ?? undefined,
        equipmentList: body.equipmentList ?? undefined,
        timePreference: body.timePreference ?? undefined,
        timePreferenceOther: body.timePreferenceOther ?? undefined,
        dietPreference: body.dietPreference ?? undefined,
        dietRestrictions: body.dietRestrictions ?? undefined,
        extraAnswers: body.extraAnswers === undefined
          ? undefined
          : (body.extraAnswers as Prisma.InputJsonValue),
      },
    });

    return {
      id: intake.id,
      trainingExperience: intake.trainingExperience,
      injuryHistory: intake.injuryHistory,
      trainingDaysPerWeek: intake.trainingDaysPerWeek,
      sessionDurationMinutes: intake.sessionDurationMinutes,
      extraAnswers: intake.extraAnswers,
      createdAt: intake.createdAt.toISOString(),
      updatedAt: intake.updatedAt.toISOString(),
    };
  }

  async prepareFirstPlan(userId: string) {
    const assessment = await this.getAssessment(userId);
    const intake = await this.prisma.aiCoachIntake.findUnique({
      where: { userId },
    });

    return {
      assessment,
      intake: intake
        ? {
            id: intake.id,
            trainingExperience: intake.trainingExperience,
            injuryHistory: intake.injuryHistory,
            trainingDaysPerWeek: intake.trainingDaysPerWeek,
            sessionDurationMinutes: intake.sessionDurationMinutes,
            extraAnswers: intake.extraAnswers ?? null,
            createdAt: intake.createdAt.toISOString(),
            updatedAt: intake.updatedAt.toISOString(),
          }
        : null,
      constraints: {
        minTrainingDays: 3,
        hardRejectUnderMinDays: true,
        knowledgeDomains: ['nutrition', 'exercise', 'training', 'metrics'],
      },
    };
  }

  async saveFirstPlan(userId: string, plan?: CoachPlan) {
    if (!plan) {
      throw new BadRequestException('Plan is required');
    }

    const existing = await this.prisma.aiCoachProgress.findUnique({
      where: { userId },
    });

    if (existing?.activePlan) {
      return {
        saved: true,
        plan: this.parsePlanJson(existing.activePlan),
        dayIndex: existing.dayIndex,
      };
    }

    const completedTasks = plan.tasks.filter((task) => task.completed).length;
    const progress = await this.prisma.aiCoachProgress.upsert({
      where: { userId },
      create: {
        userId,
        dayIndex: 1,
        streakDays: 0,
        completedTasks,
        totalTasks: plan.tasks.length,
        activePlan: plan as unknown as Prisma.InputJsonValue,
        weekSummaryReady: false,
      },
      update: {
        completedTasks,
        totalTasks: plan.tasks.length,
        activePlan: plan as unknown as Prisma.InputJsonValue,
        weekSummaryReady: false,
      },
    });

    return {
      saved: true,
      plan: this.parsePlanJson(progress.activePlan),
      dayIndex: progress.dayIndex,
    };
  }

  async getProgress(userId: string): Promise<CoachProgressResponse> {
    const progress = await this.prisma.aiCoachProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return {
        dayIndex: 1,
        streakDays: 0,
        completedTasks: 0,
        totalTasks: 0,
        activePlan: null,
        weekSummaryReady: false,
      };
    }

    return {
      dayIndex: progress.dayIndex,
      streakDays: progress.streakDays,
      completedTasks: progress.completedTasks,
      totalTasks: progress.totalTasks,
      activePlan: this.parsePlanJson(progress.activePlan),
      weekSummaryReady: progress.weekSummaryReady,
    };
  }

  async refreshProfile(userId: string, reason = 'manual'): Promise<CoachProfileResponse> {
    const assessment = await this.getAssessment(userId);
    const intake = await this.prisma.aiCoachIntake.findUnique({
      where: { userId },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const weight = user.weight ?? 65;
    const duration = intake?.sessionDurationMinutes ?? 45;
    const trainingDays = intake?.trainingDaysPerWeek ?? 3;
    const macro = this.buildMacroTarget(assessment.goalDirection, assessment.tdee, weight);
    const hydrationPlan = this.buildHydrationPlan(weight);
    const weeklyTrainingPlan = this.buildWeeklyTraining(assessment.stage, trainingDays, duration);
    const mealPlan = this.buildMealPlan(
      macro.totalCalories,
      macro.proteinGrams,
      macro.carbsGrams,
      macro.fatGrams,
    );
    const fitnessPlan: CoachProfilePlan = {
      generatedAt: new Date().toISOString(),
      ...macro,
      weeklyTrainingPlan,
    };

    const recommendationSummary = this.buildRecommendationSummary(
      assessment.stage,
      assessment.goalDirection,
      macro.totalCalories,
      hydrationPlan.dailyTargetMl,
    );
    const nextRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const existing = await this.prisma.aiCoachProfile.findUnique({
      where: { userId },
    });

    const profileVersion = (existing?.profileVersion ?? 0) + 1;
    const profile = await this.prisma.aiCoachProfile.upsert({
      where: { userId },
      create: {
        userId,
        profileVersion,
        assessmentSnapshot: assessment as unknown as Prisma.InputJsonValue,
        intakeSnapshot: (intake as unknown as Prisma.InputJsonValue) ?? undefined,
        fitnessPlan: fitnessPlan as unknown as Prisma.InputJsonValue,
        hydrationPlan: hydrationPlan as unknown as Prisma.InputJsonValue,
        mealPlan: mealPlan as unknown as Prisma.InputJsonValue,
        recommendationSummary,
        refreshReason: reason,
        lastRefreshedAt: new Date(),
        nextRefreshAt,
      },
      update: {
        profileVersion,
        assessmentSnapshot: assessment as unknown as Prisma.InputJsonValue,
        intakeSnapshot: (intake as unknown as Prisma.InputJsonValue) ?? undefined,
        fitnessPlan: fitnessPlan as unknown as Prisma.InputJsonValue,
        hydrationPlan: hydrationPlan as unknown as Prisma.InputJsonValue,
        mealPlan: mealPlan as unknown as Prisma.InputJsonValue,
        recommendationSummary,
        refreshReason: reason,
        lastRefreshedAt: new Date(),
        nextRefreshAt,
      },
    });

    await this.prisma.aiCoachProfileSnapshot.create({
      data: {
        userId,
        profileVersion,
        assessmentSnapshot: assessment as unknown as Prisma.InputJsonValue,
        intakeSnapshot: (intake as unknown as Prisma.InputJsonValue) ?? undefined,
        fitnessPlan: fitnessPlan as unknown as Prisma.InputJsonValue,
        hydrationPlan: hydrationPlan as unknown as Prisma.InputJsonValue,
        mealPlan: mealPlan as unknown as Prisma.InputJsonValue,
        recommendationSummary,
        refreshReason: reason,
      },
    });

    return this.mapProfileToResponse(profile);
  }

  async getProfile(userId: string): Promise<CoachProfileResponse> {
    const profile = await this.prisma.aiCoachProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return this.refreshProfile(userId, 'first_generation');
    }
    return this.mapProfileToResponse(profile);
  }

  async refreshDueProfiles(limit = 100): Promise<ProfileRefreshBatchResult> {
    const startedAt = Date.now();
    const now = new Date();

    const usersWithoutProfile = await this.prisma.user.findMany({
      where: {
        isProfileComplete: true,
        aiCoachAssessment: { isNot: null },
        aiCoachProfile: { is: null },
      },
      select: { id: true },
      take: limit,
    });

    const usersWithDueProfile = await this.prisma.user.findMany({
      where: {
        isProfileComplete: true,
        aiCoachProfile: {
          is: {
            nextRefreshAt: {
              lte: now,
            },
          },
        },
      },
      select: { id: true },
      take: limit,
    });

    const targetUserIds = Array.from(
      new Set([
        ...usersWithoutProfile.map((u) => u.id),
        ...usersWithDueProfile.map((u) => u.id),
      ]),
    );

    let refreshed = 0;
    let failed = 0;
    for (const userId of targetUserIds) {
      try {
        await this.refreshProfile(userId, 'scheduled');
        refreshed += 1;
      } catch {
        // Keep batch resilient for one-bad-user failures.
        failed += 1;
      }
    }
    return {
      targetUsers: targetUserIds.length,
      refreshedUsers: refreshed,
      failedUsers: failed,
      durationMs: Date.now() - startedAt,
    };
  }
}

@Injectable()
class AiCoachProfileScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiCoachProfileScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 6 * 60 * 60 * 1000; // every 6 hours

  constructor(private readonly service: AiCoachService) {}

  onModuleInit() {
    const run = async () => {
      const result = await this.service.refreshDueProfiles();
      if (result.targetUsers > 0 || result.failedUsers > 0) {
        this.logger.log(
          `AI coach refresh done: target=${result.targetUsers}, refreshed=${result.refreshedUsers}, failed=${result.failedUsers}, durationMs=${result.durationMs}`,
        );
      }
    };

    setTimeout(() => {
      void run();
    }, 20_000);

    this.timer = setInterval(() => {
      void run();
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

@Controller('ai-coach')
@UseGuards(JwtAuthGuard)
class AiCoachController {
  constructor(private readonly service: AiCoachService) {}

  @Get('assessment')
  getAssessment(@CurrentUser() user: { sub: string }) {
    return this.service.getAssessment(user.sub);
  }

  @Patch('assessment')
  updateAssessment(
    @CurrentUser() user: { sub: string },
    @Body() body: CoachAssessmentPatch,
  ) {
    return this.service.updateAssessment(user.sub, body);
  }

  @Post('intake')
  saveIntake(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      trainingExperience?: string;
      injuryHistory?: string;
      trainingDaysPerWeek?: number;
      sessionDurationMinutes?: number;
      trainingEnvironment?: string;
      equipmentList?: string[];
      timePreference?: string;
      timePreferenceOther?: string;
      dietPreference?: string;
      dietRestrictions?: string;
      extraAnswers?: Prisma.JsonValue;
    },
  ) {
    return this.service.saveIntake(user.sub, body);
  }

  @Post('first-plan')
  saveOrPrepare(
    @CurrentUser() user: { sub: string },
    @Body() body: { mode?: 'prepare' | 'save'; plan?: CoachPlan },
  ) {
    if (body.mode === 'save') {
      return this.service.saveFirstPlan(user.sub, body.plan);
    }

    return this.service.prepareFirstPlan(user.sub);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: { sub: string }) {
    return this.service.getProgress(user.sub);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: { sub: string }) {
    return this.service.getProfile(user.sub);
  }

  @Post('profile/refresh')
  refreshProfile(@CurrentUser() user: { sub: string }) {
    return this.service.refreshProfile(user.sub, 'manual');
  }
}

@Module({
  controllers: [AiCoachController],
  providers: [AiCoachService, AiCoachProfileScheduler],
})
export class AiCoachModule {}
