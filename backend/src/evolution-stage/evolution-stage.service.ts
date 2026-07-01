import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AiService, BodyFatEstimateResult } from '../ai/ai.service';
import { ImageGenService } from '../image-gen/image-gen.module';
import { UPLOADS_DIR, buildUploadUrl } from '../common/upload.util';

export interface StageItem {
  stageIndex: number;
  targetBodyFat: number;
  title: string;
  previewImageUrl?: string;
  isUnlocked: boolean;
  actualImageUrl?: string;
  qualifiedCount: number;
}

export interface PredictionResult {
  days: number;
  predictedDate: string;
  targetStageIndex: number;
  targetBodyFat: number;
  currentBodyFat: number;
  scenario: string;
}

type UserSnapshot = {
  gender: string | null;
  weight: number | null;
  height: number | null;
  age: number | null;
};

const STAGE_COUNT = 7;
const QUALIFIED_REQUIRED = 2;
const QUALIFIED_INTERVAL_HOURS = 24;

// Deceleration curve: progress accumulates fast early, slows down later.
// Stage 0: 0%, Stage 1: 35%, Stage 2: 55%, Stage 3: 70%, Stage 4: 82%, Stage 5: 92%, Stage 6: 100%
const STAGE_PROGRESS = [0, 0.35, 0.55, 0.70, 0.82, 0.92, 1.0] as const;

const STAGE_TITLES = [
  '当前的我',
  '初见成效',
  '稳步蜕变',
  '轮廓初现',
  '接近目标',
  '最后冲刺',
  '理想中的我',
] as const;

/** Lookup table: body-description strings by gender + body-fat range. */
const BODY_DESC: Record<string, Record<string, string>> = {
  male: {
    '8-12':  '清晰腹肌线条，低体脂，肌肉分离度高',
    '12-16': '隐约腹肌轮廓，胸肩线条分明，运动型身材',
    '16-20': '身材匀称，无明显赘肉，略有肌肉线条',
    '20-25': '体型正常，腹部稍有脂肪覆盖，轮廓柔和',
    '25-35': '腹部圆润，胸肩线条模糊，体脂偏高',
  },
  female: {
    '18-22': '马甲线隐约可见，肩背紧致，低体脂运动型',
    '22-26': '腰腹平坦，臀部线条圆润，紧致健康',
    '26-30': '身材匀称，曲线柔和，略有小腹',
    '30-35': '腹部微凸，手臂大腿略有赘肉',
    '35-45': '体脂偏高，腰腹圆润，轮廓模糊',
  },
};

@Injectable()
export class EvolutionStageService {
  private readonly logger = new Logger(EvolutionStageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly imageGenService?: ImageGenService,
  ) {}

  // ── Public Read ──────────────────────────────────────────────────────

  async getStages(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true, weight: true, height: true, age: true },
    });

    if (!user) {
      return { stages: [], currentBodyFat: 0 };
    }

    await this.initializeStages(userId, user.gender);

    const [stages, latestAssessment] = await Promise.all([
      this.prisma.evolutionStage.findMany({
        where: { userId },
        orderBy: { stageIndex: 'asc' },
      }),
      this.prisma.evolutionAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { bodyFatEstimate: true },
      }),
    ]);

    const currentBodyFat =
      latestAssessment?.bodyFatEstimate ?? this.calculateBodyFatFromUser(user);

    const stageItems: StageItem[] = stages.map((stage) => ({
      stageIndex: stage.stageIndex,
      targetBodyFat: stage.targetBodyFat,
      title: stage.title,
      previewImageUrl: this.normalizeImageUrl(stage.previewImageUrl),
      isUnlocked: stage.isUnlocked,
      actualImageUrl: this.normalizeImageUrl(stage.actualImageUrl),
      qualifiedCount: stage.qualifiedCount,
    }));

    return { stages: stageItems, currentBodyFat };
  }

  // ── Assess Upload ────────────────────────────────────────────────────

  async assessUpload(userId: string, recordId: string) {
    const [record, user] = await Promise.all([
      this.prisma.evolutionRecord.findFirst({
        where: { id: recordId, userId },
        select: { id: true, imageUrl: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, weight: true, height: true, age: true },
      }),
    ]);

    if (!record) throw new NotFoundException('Evolution record not found');
    if (!user) throw new NotFoundException('User not found');

    await this.initializeStages(userId, user.gender);

    const existingAssessment = await this.prisma.evolutionAssessment.findUnique({
      where: { recordId: record.id },
      select: { bodyFatEstimate: true, isGeminiCalibrated: true },
    });

    if (existingAssessment) {
      return {
        bodyFat: existingAssessment.bodyFatEstimate,
        isGeminiCalibrated: existingAssessment.isGeminiCalibrated,
      };
    }

    const assessmentCount =
      (await this.prisma.evolutionAssessment.count({ where: { userId } })) + 1;

    // Solo-model AI vision estimation with BMI fallback.
    let bodyFat = this.calculateBodyFatFromUser(user);
    let aiBodyFat: number | null = null;
    let isGeminiCalibrated = false;
    let multiModelDetail: BodyFatEstimateResult['aggregate'] | null = null;

    try {
      const result = await this.aiService.estimateBodyFatFromImage(
        record.imageUrl,
        {
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
        },
      );
      if (Number.isFinite(result.value)) {
        aiBodyFat = this.normalizeBodyFat(result.value);
        bodyFat = aiBodyFat;
        isGeminiCalibrated = true;
        multiModelDetail = result.aggregate;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`AI body-fat estimation failed for ${record.id}: ${message}`);
    }

    const normalizedBodyFat = this.normalizeBodyFat(bodyFat);

    try {
      const assessment = await this.prisma.evolutionAssessment.create({
        data: {
          userId,
          recordId: record.id,
          bodyFatEstimate: normalizedBodyFat,
          geminiBodyFat: aiBodyFat,
          isGeminiCalibrated,
          assessmentCount,
          multiModelDetail: (multiModelDetail ?? undefined) as any,
          modelCount: multiModelDetail?.totalCount ?? 1,
          modelSpread: multiModelDetail?.spread ?? 0,
        },
        select: { createdAt: true },
      });

      await this.checkUnlock(userId, normalizedBodyFat, record.imageUrl, assessment.createdAt);

      // Fire-and-forget: generate next-stage preview.
      this.generateNextStagePreview(userId, record.imageUrl).catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Stage preview generation failed for record ${record.id}: ${message}`);
      });

      return { bodyFat: normalizedBodyFat, isGeminiCalibrated };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.evolutionAssessment.findUnique({
          where: { recordId: record.id },
          select: { bodyFatEstimate: true, isGeminiCalibrated: true },
        });
        if (duplicate) {
          return {
            bodyFat: duplicate.bodyFatEstimate,
            isGeminiCalibrated: duplicate.isGeminiCalibrated,
          };
        }
      }
      throw error;
    }
  }

  // ── North-Star Onboarding ────────────────────────────────────────────

  /**
   * Onboarding pipeline:
   *   1. Estimate starting body fat from the user's first photo.
   *   2. Create an onboarding EvolutionRecord + EvolutionAssessment.
   *   3. Initialize the 7-stage deceleration curve.
   *   4. Generate the Stage-6 "North Star" image as the ultimate goal.
   */
  async generateNorthStar(userId: string, startImageUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true, weight: true, height: true, age: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // 1. Estimate start body-fat (AI with BMI fallback).
    let startBodyFat = this.calculateBodyFatFromUser(user);
    let isAiCalibrated = false;
    let multiModelDetail: BodyFatEstimateResult['aggregate'] | null = null;

    try {
      const result = await this.aiService.estimateBodyFatFromImage(
        startImageUrl,
        { gender: user.gender, age: user.age, height: user.height, weight: user.weight },
      );
      if (Number.isFinite(result.value)) {
        startBodyFat = this.normalizeBodyFat(result.value);
        isAiCalibrated = true;
        multiModelDetail = result.aggregate;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`NorthStar body-fat estimation failed: ${message}`);
    }

    // 2. Create onboarding record + assessment.
    const record = await this.prisma.evolutionRecord.create({
      data: {
        userId,
        imageUrl: startImageUrl,
        status: 'onboarding',
        note: 'Onboarding north-star',
      },
    });

    await this.prisma.evolutionAssessment.create({
      data: {
        userId,
        recordId: record.id,
        bodyFatEstimate: startBodyFat,
        geminiBodyFat: isAiCalibrated ? startBodyFat : null,
        isGeminiCalibrated: isAiCalibrated,
        assessmentCount: 1,
        multiModelDetail: (multiModelDetail ?? undefined) as any,
        modelCount: multiModelDetail?.totalCount ?? 1,
        modelSpread: multiModelDetail?.spread ?? 0,
      },
    });

    // 3. Initialize stages with deceleration curve.
    await this.initializeStages(userId, user.gender);

    // 4. Set Stage-0 preview to the uploaded start photo.
    await this.prisma.evolutionStage.updateMany({
      where: { userId, stageIndex: 0 },
      data: { previewImageUrl: startImageUrl },
    });

    // 5. Generate Stage-6 "北极星" image.
    let northStarUrl: string | undefined;
    if (this.imageGenService) {
      try {
        const targetBodyFat = this.calculateTargetBodyFat(user.gender);
        const genderLabel = user.gender === 'female' ? '女性' : '男性';
        const bodyDesc = this.lookupBodyDescription(user.gender, targetBodyFat);

        const prompt = [
          `Transform this person's fitness start photo to show their ULTIMATE FITNESS GOAL at ${targetBodyFat}% body fat.`,
          `Gender: ${genderLabel}.`,
          `Target physique: ${bodyDesc}.`,
          'This is the FINAL "after" photo — the best possible version of themselves.',
          'Keep face, skin tone, hair, and background identical.',
          'Only change body composition: dramatically reduce body fat, reveal muscle definition.',
          'Photorealistic. Same person. Same identity. Different body.',
        ].join(' ');

        const dataUrl = await this.imageUrlToDataUrl(startImageUrl);
        const genResult = await this.imageGenService.generateIdealBody(userId, {
          prompt,
          currentImageBase64: dataUrl,
        });

        if (genResult.image) {
          northStarUrl = this.saveBase64Image(genResult.image);
          await this.prisma.evolutionStage.updateMany({
            where: { userId, stageIndex: 6 },
            data: { previewImageUrl: northStarUrl },
          });
          this.logger.log(`NorthStar image generated for user ${userId}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(`NorthStar image generation failed: ${message}`);
      }
    }

    // Return summary.
    const stages = await this.prisma.evolutionStage.findMany({
      where: { userId },
      orderBy: { stageIndex: 'asc' },
      select: { stageIndex: true, targetBodyFat: true, title: true, previewImageUrl: true, isUnlocked: true },
    });

    return {
      startBodyFat,
      targetBodyFat: this.calculateTargetBodyFat(user.gender),
      stages: stages.map((s) => ({
        ...s,
        previewImageUrl: this.normalizeImageUrl(s.previewImageUrl),
      })),
      northStarUrl: this.normalizeImageUrl(northStarUrl),
    };
  }

  // ── Prediction ───────────────────────────────────────────────────────

  async getPrediction(
    userId: string,
    scenario: { proteinChangePercent?: number } = {},
  ): Promise<PredictionResult> {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [assessments, stages, user, dietRecords] = await Promise.all([
      this.prisma.evolutionAssessment.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { bodyFatEstimate: true, createdAt: true },
      }),
      this.prisma.evolutionStage.findMany({
        where: { userId },
        orderBy: { stageIndex: 'asc' },
        select: { stageIndex: true, targetBodyFat: true, isUnlocked: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, weight: true, height: true, age: true },
      }),
      this.prisma.dietRecord.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { protein: true, createdAt: true },
      }),
    ]);

    const currentBodyFat = assessments.length
      ? assessments[assessments.length - 1].bodyFatEstimate
      : this.calculateBodyFatFromUser(user);

    const nextLockedStage = stages.find((s) => s.stageIndex > 0 && !s.isUnlocked);
    const targetStage = nextLockedStage ?? stages.find((s) => s.stageIndex === 6);
    const targetBodyFat =
      targetStage?.targetBodyFat ?? this.calculateTargetBodyFat(user?.gender ?? null);

    let slopePerDay = -0.04;
    if (assessments.length >= 2) {
      const recent = assessments.slice(-7);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const days = Math.max(
        1,
        (last.createdAt.getTime() - first.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      slopePerDay = (last.bodyFatEstimate - first.bodyFatEstimate) / days;
    }

    const proteinChangePercent = scenario.proteinChangePercent ?? 0;
    const avgProtein =
      dietRecords.reduce((sum, r) => sum + (r.protein ?? 0), 0) /
      Math.max(1, dietRecords.length || 1);
    const proteinFactor =
      proteinChangePercent && avgProtein > 0 ? 1 + proteinChangePercent * 1.5 : 1;

    let adjustedSlope = slopePerDay * proteinFactor;
    if (adjustedSlope >= 0 || Math.abs(adjustedSlope) < 0.001) {
      adjustedSlope = -0.04 * proteinFactor;
    }

    const diff = currentBodyFat - targetBodyFat;
    const daysNeeded = diff > 0 ? Math.ceil(diff / Math.abs(adjustedSlope)) : 0;
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + daysNeeded);
    const predictedDateStr = `${predictedDate.getMonth() + 1}月${predictedDate.getDate()}日`;

    return {
      days: daysNeeded,
      predictedDate: predictedDateStr,
      targetStageIndex: targetStage?.stageIndex ?? 1,
      targetBodyFat: Number(targetBodyFat.toFixed(1)),
      currentBodyFat: Number(currentBodyFat.toFixed(1)),
      scenario:
        proteinChangePercent > 0
          ? `蛋白质摄入 +${Math.round(proteinChangePercent * 100)}%`
          : '当前轨迹',
    };
  }

  // ── Next-Stage Preview Generation ────────────────────────────────────

  private async generateNextStagePreview(userId: string, recordImageUrl: string) {
    if (!this.imageGenService) return;

    try {
      // Find next locked stage (skip 0, skip 6 – stage 6 is the north star).
      const nextStage = await this.prisma.evolutionStage.findFirst({
        where: {
          userId,
          isUnlocked: false,
          stageIndex: { gt: 0, lt: 6 },
        },
        orderBy: { stageIndex: 'asc' },
      });

      if (!nextStage) return;

      // Don't regenerate if a generated preview already exists.
      if (nextStage.previewImageUrl && this.isGenStageUrl(nextStage.previewImageUrl)) {
        return;
      }

      // Get the user's start photo as reference image.
      const startRecord = await this.prisma.evolutionRecord.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { imageUrl: true },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true },
      });

      const bodyDesc = this.lookupBodyDescription(user?.gender ?? null, nextStage.targetBodyFat);

      const prompt = [
        `Transform this fitness progress photo to show the same person at exactly ${nextStage.targetBodyFat}% body fat.`,
        `Target look: ${bodyDesc}.`,
        'Keep everything else identical: face, skin tone, hair, clothing style, posture,',
        'background, and lighting.',
        'The only change is body composition — reduce body fat to match the target.',
        'Photorealistic. No face distortion. No background changes.',
      ].join(' ');

      const dataUrl = await this.imageUrlToDataUrl(recordImageUrl);
      const referenceBase64 = startRecord?.imageUrl
        ? await this.imageUrlToDataUrl(startRecord.imageUrl)
        : undefined;

      const genResult = await this.imageGenService.generateIdealBody(userId, {
        prompt,
        currentImageBase64: dataUrl,
        referenceImageBase64: referenceBase64,
      });

      if (!genResult.image) return;

      const savedUrl = this.saveBase64Image(genResult.image);
      await this.prisma.evolutionStage.update({
        where: { id: nextStage.id },
        data: { previewImageUrl: savedUrl },
      });

      this.logger.log(
        `Generated stage preview for stage ${nextStage.stageIndex} (user ${userId})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Stage preview generation failed: ${message}`);
    }
  }

  // ── Lookup Helpers ───────────────────────────────────────────────────

  /** Map gender + body-fat to a descriptive physique string. */
  private lookupBodyDescription(gender: string | null, bodyFat: number): string {
    const table = BODY_DESC[gender === 'female' ? 'female' : 'male'] ?? BODY_DESC.male;
    // Walk ranges from tight to wide.
    const ranges = Object.keys(table).sort(
      (a, b) => {
        const aLo = Number(a.split('-')[0]);
        const bLo = Number(b.split('-')[0]);
        return aLo - bLo;
      },
    );
    for (const range of ranges) {
      const [lo, hi] = range.split('-').map(Number);
      if (bodyFat >= lo && bodyFat <= hi) return table[range];
    }
    // Fallback: first range if below, last range if above.
    if (bodyFat < Number(ranges[0]!.split('-')[0])) return table[ranges[0]!]!;
    const last = ranges[ranges.length - 1]!;
    return table[last]!;
  }

  // ── Stage Initialization ─────────────────────────────────────────────

  private async initializeStages(userId: string, gender: string | null) {
    const { start, target } = await this.resolveStageEndpoints(userId, gender);
    const targets = this.buildStageTargets(gender, start, target);
    const stageZeroPreviewImage = await this.getLatestGeneratedIdealImage(userId);

    await Promise.all(
      targets.map((targetBodyFat, stageIndex) =>
        this.prisma.evolutionStage.upsert({
          where: { userId_stageIndex: { userId, stageIndex } },
          create: {
            userId,
            stageIndex,
            targetBodyFat,
            title: STAGE_TITLES[stageIndex] ?? `Stage ${stageIndex + 1}`,
            previewImageUrl:
              stageIndex === 0 ? stageZeroPreviewImage ?? null : null,
            isUnlocked: stageIndex === 0,
            unlockedAt: stageIndex === 0 ? new Date() : null,
            qualifiedCount: stageIndex === 0 ? QUALIFIED_REQUIRED : 0,
          },
          update: {
            targetBodyFat,
            title: STAGE_TITLES[stageIndex] ?? `Stage ${stageIndex + 1}`,
          },
        }),
      ),
    );

    // Ensure Stage 0 is always unlocked.
    await this.prisma.evolutionStage.updateMany({
      where: { userId, stageIndex: 0, isUnlocked: false },
      data: { isUnlocked: true, unlockedAt: new Date() },
    });

    await this.prisma.evolutionStage.updateMany({
      where: { userId, stageIndex: 0, qualifiedCount: { lt: QUALIFIED_REQUIRED } },
      data: { qualifiedCount: QUALIFIED_REQUIRED },
    });

    if (stageZeroPreviewImage) {
      await this.prisma.evolutionStage.updateMany({
        where: {
          userId,
          stageIndex: 0,
          NOT: { previewImageUrl: stageZeroPreviewImage },
        },
        data: { previewImageUrl: stageZeroPreviewImage },
      });
    }
  }

  /**
   * Resolve start → end body-fat endpoints.
   * Start = first-ever AI assessment (not latest), or BMI fallback.
   * End   = AiCoach target, or gender-based default.
   */
  private async resolveStageEndpoints(
    userId: string,
    gender: string | null,
  ): Promise<{ start: number; target: number }> {
    // Use the first-ever assessment as the true starting point.
    const firstAssessment = await this.prisma.evolutionAssessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { bodyFatEstimate: true },
    });

    const start = firstAssessment?.bodyFatEstimate
      ? this.normalizeBodyFat(firstAssessment.bodyFatEstimate)
      : gender === 'female'
        ? 35
        : 25;

    const coachGoal = await this.prisma.aiCoachAssessment.findUnique({
      where: { userId },
      select: { targetBodyFatEstimate: true },
    });

    const target = coachGoal?.targetBodyFatEstimate
      ? this.normalizeBodyFat(coachGoal.targetBodyFatEstimate)
      : this.calculateTargetBodyFat(gender);

    return { start: Math.max(start, target), target };
  }

  // ── Unlock Logic ─────────────────────────────────────────────────────

  private async checkUnlock(
    userId: string,
    bodyFat: number,
    latestImageUrl: string | null,
    assessedAt: Date,
  ) {
    const stage = await this.prisma.evolutionStage.findFirst({
      where: { userId, isUnlocked: false },
      orderBy: { stageIndex: 'asc' },
    });

    if (!stage) return;

    if (bodyFat > stage.targetBodyFat) {
      if (stage.qualifiedCount > 0 || stage.lastQualifiedAt) {
        await this.prisma.evolutionStage.update({
          where: { id: stage.id },
          data: { qualifiedCount: 0, lastQualifiedAt: null },
        });
      }
      return;
    }

    const qualifiedCount = Math.max(0, stage.qualifiedCount);

    if (!stage.lastQualifiedAt) {
      await this.prisma.evolutionStage.update({
        where: { id: stage.id },
        data: {
          qualifiedCount: Math.max(1, qualifiedCount),
          lastQualifiedAt: assessedAt,
        },
      });
      return;
    }

    const elapsedHours =
      (assessedAt.getTime() - stage.lastQualifiedAt.getTime()) / (1000 * 60 * 60);

    if (elapsedHours < QUALIFIED_INTERVAL_HOURS) {
      if (qualifiedCount < 1) {
        await this.prisma.evolutionStage.update({
          where: { id: stage.id },
          data: { qualifiedCount: 1 },
        });
      }
      return;
    }

    const nextQualifiedCount = Math.min(QUALIFIED_REQUIRED, qualifiedCount + 1);
    const data: Prisma.EvolutionStageUpdateInput = {
      qualifiedCount: nextQualifiedCount,
      lastQualifiedAt: assessedAt,
    };

    if (nextQualifiedCount >= QUALIFIED_REQUIRED) {
      data.isUnlocked = true;
      data.unlockedAt = assessedAt;
      const normalizedImageUrl = this.normalizeImageUrl(latestImageUrl);
      if (normalizedImageUrl) {
        data.actualImageUrl = normalizedImageUrl;
      }
    }

    await this.prisma.evolutionStage.update({ where: { id: stage.id }, data });
  }

  // ── Stage Targets (Deceleration Curve) ───────────────────────────────

  /**
   * Build 7 stage targets using the deceleration curve.
   * Instead of linear interpolation, we use STAGE_PROGRESS:
   *   targetBodyFat[i] = start - (start - end) * STAGE_PROGRESS[i]
   */
  private buildStageTargets(
    gender: string | null,
    start?: number,
    target?: number,
  ): number[] {
    const safeStart = start ?? (gender === 'female' ? 35 : 25);
    const safeTarget = target ?? this.calculateTargetBodyFat(gender);
    const span = safeStart - safeTarget;

    return STAGE_PROGRESS.map((progress) =>
      Number((safeStart - span * progress).toFixed(1)),
    );
  }

  // ── Body-Fat Helpers ─────────────────────────────────────────────────

  private calculateTargetBodyFat(gender: string | null): number {
    return gender === 'female' ? 20 : 12;
  }

  private calculateBodyFatFromUser(user: UserSnapshot | null | undefined): number {
    if (!user) return 25;

    if (!user.weight || !user.height || user.weight <= 0 || user.height <= 0) {
      return user.gender === 'female' ? 35 : 25;
    }

    const bmi = user.weight / Math.pow(user.height / 100, 2);
    if (!Number.isFinite(bmi)) return user.gender === 'female' ? 35 : 25;

    const age = user.age && user.age > 0 ? user.age : 30;
    const estimated =
      user.gender === 'female'
        ? 1.2 * bmi + 0.23 * age - 5.4
        : 1.2 * bmi + 0.23 * age - 16.2;

    return this.normalizeBodyFat(estimated);
  }

  // ── Utility ──────────────────────────────────────────────────────────

  private async getLatestGeneratedIdealImage(userId: string): Promise<string | undefined> {
    const task = await this.prisma.imageGenTask.findFirst({
      where: { userId, status: 'completed', resultImageUrl: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { resultImageUrl: true },
    });
    return this.normalizeImageUrl(task?.resultImageUrl);
  }

  private normalizeImageUrl(imageUrl: string | null | undefined): string | undefined {
    if (!imageUrl) return undefined;
    const normalized = imageUrl.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeBodyFat(value: number): number {
    return Number(Math.max(3, Math.min(60, value)).toFixed(1));
  }

  private async imageUrlToDataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:')) return imageUrl;

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${imageUrl}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      const pathname = new URL(imageUrl).pathname;
      const mime = this.mimeFromExt(extname(pathname));
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }

    const localPath = imageUrl.startsWith('/uploads/')
      ? join(process.cwd(), 'uploads', imageUrl.replace('/uploads/', ''))
      : join(process.cwd(), imageUrl);
    const buffer = readFileSync(localPath);
    const mime = this.mimeFromExt(extname(localPath));
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  private mimeFromExt(extension: string): string {
    const ext = extension.toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    return 'image/jpeg';
  }

  private saveBase64Image(dataUrl: string): string {
    let base64Data = dataUrl;
    if (dataUrl.startsWith('data:')) {
      const commaIndex = dataUrl.indexOf(',');
      base64Data = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    }
    const filename = `gen-stage-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    const filepath = join(UPLOADS_DIR, filename);
    writeFileSync(filepath, Buffer.from(base64Data.replace(/\s/g, ''), 'base64'));
    return buildUploadUrl(filename);
  }

  private isGenStageUrl(url: string): boolean {
    return url.includes('/gen-stage-');
  }
}
