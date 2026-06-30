import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
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

// §2.1 七阶段（减速曲线）—— 心理意义对齐策略文档
const STAGE_TITLES = [
  '当前的我',     // 0% 诚实面对
  '初见成效',     // 35% "真的在变"
  '轮廓清晰',     // 55% 朋友注意到
  '蜕变可见',     // 70% 穿衣变好看
  '接近理想',     // 82% 自信建立
  '最后冲刺',     // 92% 突破平台
  '理想中的我',   // 100% 达成目标
] as const;

// §2.1 累计进度曲线（前快后慢，真实减脂规律）
const STAGE_PROGRESS = [0, 0.35, 0.55, 0.70, 0.82, 0.92, 1.0] as const;

@Injectable()
export class EvolutionStageService {
  private readonly logger = new Logger(EvolutionStageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly imageGenService?: ImageGenService,
  ) {}

  async getStages(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        gender: true,
        weight: true,
        height: true,
        age: true,
      },
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

  async assessUpload(userId: string, recordId: string) {
    const [record, user] = await Promise.all([
      this.prisma.evolutionRecord.findFirst({
        where: { id: recordId, userId },
        select: {
          id: true,
          imageUrl: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          gender: true,
          weight: true,
          height: true,
          age: true,
        },
      }),
    ]);

    if (!record) {
      throw new NotFoundException('Evolution record not found');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.initializeStages(userId, user.gender);

    const existingAssessment = await this.prisma.evolutionAssessment.findUnique({
      where: { recordId: record.id },
      select: {
        bodyFatEstimate: true,
        isGeminiCalibrated: true,
      },
    });

    if (existingAssessment) {
      return {
        bodyFat: existingAssessment.bodyFatEstimate,
        isGeminiCalibrated: existingAssessment.isGeminiCalibrated,
      };
    }

    const assessmentCount =
      (await this.prisma.evolutionAssessment.count({ where: { userId } })) + 1;

    // Try real AI vision estimation first, fall back to BMI-based formula.
    let bodyFat = this.calculateBodyFatFromUser(user);
    let aiBodyFat: number | null = null;
    let isGeminiCalibrated = false;
    let multiModelDetail: unknown = null;
    let modelCount: number | null = null;
    let modelSpread: number | null = null;

    try {
      const estimate = await this.aiService.estimateBodyFatFromImage(record.imageUrl, {
        gender: user.gender,
        age: user.age,
        height: user.height,
        weight: user.weight,
      });
      if (Number.isFinite(estimate.value)) {
        aiBodyFat = this.normalizeBodyFat(estimate.value);
        bodyFat = aiBodyFat;
        isGeminiCalibrated = true;
        multiModelDetail = estimate.aggregate.breakdown;
        modelCount = estimate.aggregate.keptCount;
        modelSpread = estimate.aggregate.spread;
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
          multiModelDetail: multiModelDetail as Prisma.InputJsonValue | undefined,
          modelCount,
          modelSpread,
          assessmentCount,
        },
        select: {
          createdAt: true,
        },
      });

      await this.checkUnlock(userId, normalizedBodyFat, record.imageUrl, assessment.createdAt);

      // Generate next-stage preview image asynchronously (fire-and-forget).
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
          select: {
            bodyFatEstimate: true,
            isGeminiCalibrated: true,
          },
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
        where: {
          userId,
          createdAt: { gte: since },
        },
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

    // Compute real body-fat change slope (% per day) from the most recent assessments.
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

    // Adjust speed based on the requested protein change scenario.
    const proteinChangePercent = scenario.proteinChangePercent ?? 0;
    const avgProtein =
      dietRecords.reduce((sum, record) => sum + (record.protein ?? 0), 0) /
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

  /**
   * Onboarding 北极星生成（仅注册时调一次）
   *
   * 完整流程：
   *  1) 视觉模型估起点体脂率（结合身高体重，§3.3 模板A）
   *  2) 把起点照写为 EvolutionRecord（status='onboarding'）+ EvolutionAssessment
   *     —— 这样起点照也在身材轨迹里，resolveStageEndpoints 会读它作为 start
   *  3) initializeStages 自动按 startBodyFat → targetBodyFat 建好 7 阶段曲线
   *  4) Stage 0 的 actualImageUrl 设为起点照本身（懒生成时不会再调 AI 改它）
   *  5) 基于起点照直接生成 Stage 6 终极图（北极星，模板B + targetBodyFat = stage6 目标）
   *
   * 调用方（users/onboarding）应 fire-and-forget 调本方法，让 HTTP 请求秒回。
   */
  async generateNorthStar(userId: string, startImageUrl: string): Promise<void> {
    const trimmed = startImageUrl?.trim();
    if (!trimmed) {
      this.logger.warn(`generateNorthStar: empty startImageUrl for user ${userId}`);
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { gender: true, age: true, height: true, weight: true },
      });
      if (!user) {
        this.logger.warn(`generateNorthStar: user ${userId} not found`);
        return;
      }

      // ── ① 起点体脂率：视觉为主，BMI 兜底 ──
      let startBodyFat = this.calculateBodyFatFromUser(user);
      let isVisuallyCalibrated = false;
      let northStarDetail: unknown = null;
      let northStarModelCount: number | null = null;
      let northStarSpread: number | null = null;
      try {
        const estimate = await this.aiService.estimateBodyFatFromImage(trimmed, {
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
        });
        if (Number.isFinite(estimate.value)) {
          startBodyFat = this.normalizeBodyFat(estimate.value);
          isVisuallyCalibrated = true;
          northStarDetail = estimate.aggregate.breakdown;
          northStarModelCount = estimate.aggregate.keptCount;
          northStarSpread = estimate.aggregate.spread;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.warn(`North-star body-fat estimation failed, fall back to BMI: ${message}`);
      }
      startBodyFat = this.normalizeBodyFat(startBodyFat);

      // ── ② 起点照写为 EvolutionRecord + EvolutionAssessment ──
      // EvolutionAssessment.recordId 是 @unique 必填，所以先建一个 record 指向起点照。
      const existingFirstAssessment = await this.prisma.evolutionAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (!existingFirstAssessment) {
        const onboardingRecord = await this.prisma.evolutionRecord.create({
          data: {
            userId,
            imageUrl: trimmed,
            status: 'onboarding',
            note: '起点照（onboarding）',
          },
          select: { id: true },
        });

        await this.prisma.evolutionAssessment.create({
          data: {
            userId,
            recordId: onboardingRecord.id,
            bodyFatEstimate: startBodyFat,
            geminiBodyFat: isVisuallyCalibrated ? startBodyFat : null,
            isGeminiCalibrated: isVisuallyCalibrated,
            multiModelDetail: northStarDetail as Prisma.InputJsonValue | undefined,
            modelCount: northStarModelCount,
            modelSpread: northStarSpread,
            assessmentCount: 1,
          },
        });
      }

      // ── ③ 初始化 7 阶段（读首次评估 → 起点 → 减速曲线）──
      await this.initializeStages(userId, user.gender);

      // ── ④ Stage 0 = 起点照本身 ──
      await this.prisma.evolutionStage.updateMany({
        where: { userId, stageIndex: 0 },
        data: {
          previewImageUrl: trimmed,
          actualImageUrl: trimmed,
        },
      });

      // ── ⑤ Stage 6 = 北极星终极图（基于起点照 → 目标体脂率） ──
      const stage6 = await this.prisma.evolutionStage.findUnique({
        where: { userId_stageIndex: { userId, stageIndex: 6 } },
        select: { id: true, previewImageUrl: true, targetBodyFat: true },
      });

      if (!stage6) {
        this.logger.warn(`generateNorthStar: stage 6 missing after init for user ${userId}`);
        return;
      }

      // 已有北极星则跳过（幂等：重复触发不会重新烧钱）
      if (stage6.previewImageUrl && this.isGenStageUrl(stage6.previewImageUrl)) {
        this.logger.log(`North-star already generated for user ${userId}, skipping`);
        return;
      }

      if (!this.imageGenService) {
        this.logger.warn('ImageGenService not available, skip north-star');
        return;
      }

      const gender = user.gender === 'female' ? 'female' : 'male';
      const genderWord = gender === 'female' ? 'woman' : 'man';
      const age = user.age && user.age > 0 ? user.age : 30;
      const targetBodyFat = Number(stage6.targetBodyFat.toFixed(1));
      const bodyDescriptionByTarget = this.lookupBodyDescription(gender, targetBodyFat);

      // 身份锚点占位（§3.2，未接入 UserIdentityProfile 表时引用 reference 照锁脸）
      const identityAnchors =
        'the same face, hair style, skin tone, eyewear, and ethnicity as the reference photo';
      const originalOutfit = 'same clothing as in the base photo';

      // §3.4b 模板 D —— onboarding 终极目标身材图（跨度最大，需特别约束可信度）
      const prompt = [
        'Photorealistic body transformation of the EXACT same person shown in the reference photo.',
        "This is the person's ULTIMATE FITNESS GOAL — show what they will look like after a complete,",
        'successful transformation. This is the destination that will motivate them to start.',
        '',
        'Keep these identity features ABSOLUTELY IDENTICAL — do NOT alter them in any way:',
        `${identityAnchors}, same facial features and bone structure, same height and body frame.`,
        'The face MUST be recognizably the same person, just leaner.',
        '',
        `This is a ${age}-year-old ${genderWord} currently at approximately ${startBodyFat}% body fat.`,
        `Transform the body to the FINAL GOAL of ${targetBodyFat}% body fat — their ideal physique.`,
        bodyDescriptionByTarget,
        '',
        'IMPORTANT — believability constraints for this large transformation:',
        '- This must look like a REALISTIC long-term fitness result (8-12 months of dedicated work),',
        '  NOT an impossible or digitally-faked extreme. Athletic and healthy, not bodybuilder-stage lean.',
        '- The face becomes leaner and more defined (sharper jawline, less fullness) but stays',
        '  recognizably the SAME person — do not swap or idealize the face.',
        '',
        'Strict constraints:',
        '- ONLY change body composition (reduce fat, reveal natural muscle). Identity, skin color,',
        `  hair, glasses, clothing (${originalOutfit}), posture, and background MUST stay identical`,
        '  to the base photo.',
        `- Do NOT swap faces. Do NOT change ethnicity. Do NOT go below ${targetBodyFat}% body fat.`,
        '- Natural skin texture, realistic soft shadows, no plastic/smoothed/waxed/oiled look.',
        '- Full body visible, standing relaxed, same camera angle as base photo.',
        '',
        'Style: ultra-realistic photography, soft natural daylight, sharp focus, 8K detail.',
        'Output a single realistic photo.',
      ].join('\n');

      const baseDataUrl = await this.imageUrlToDataUrl(trimmed);
      const result = await this.imageGenService.generateIdealBody(userId, {
        prompt,
        currentImageBase64: baseDataUrl,
      });

      if (!result.image) {
        this.logger.warn(`North-star image generation returned empty for user ${userId}`);
        return;
      }

      const savedUrl = this.saveBase64Image(result.image);
      await this.prisma.evolutionStage.update({
        where: { id: stage6.id },
        data: { previewImageUrl: savedUrl },
      });

      this.logger.log(
        `North-star generated for user ${userId}: ${startBodyFat}% → ${targetBodyFat}% (stage 6)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`North-star generation failed for user ${userId}: ${message}`);
    }
  }

  private async generateNextStagePreview(userId: string, recordImageUrl: string) {
    if (!this.imageGenService) {
      return;
    }

    try {
      const nextStage = await this.prisma.evolutionStage.findFirst({
        where: { userId, isUnlocked: false },
        orderBy: { stageIndex: 'asc' },
      });

      if (!nextStage) {
        return;
      }

      // Stage 6 = 北极星，由 generateNorthStar 在 onboarding 时专管。
      // 这里跳过，避免日常解锁时覆盖掉用户的"未来目标"图。
      if (nextStage.stageIndex === 6) {
        return;
      }

      // Stage 0 在 generateNorthStar 已设为起点照本身，不应走 AI 生成路径。
      if (nextStage.stageIndex === 0) {
        return;
      }

      // Don't regenerate if a user photo preview already exists for this stage.
      if (nextStage.previewImageUrl && this.isGenStageUrl(nextStage.previewImageUrl)) {
        return;
      }

      // ── 收集变量（§3.1 变量字典）──
      const [user, latestAssessment, startRecord] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { gender: true, age: true },
        }),
        this.prisma.evolutionAssessment.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { bodyFatEstimate: true },
        }),
        // 起点照（最早的 record），作为多图融合的 reference
        this.prisma.evolutionRecord.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: { imageUrl: true },
        }),
      ]);

      const gender = user?.gender === 'female' ? 'female' : 'male';
      const genderWord = gender === 'female' ? 'woman' : 'man';
      const age = user?.age && user.age > 0 ? user.age : 30;
      const currentBodyFat = Number(
        (latestAssessment?.bodyFatEstimate ?? nextStage.targetBodyFat + 5).toFixed(1),
      );
      const targetBodyFat = Number(nextStage.targetBodyFat.toFixed(1));
      const bodyDescriptionByTarget = this.lookupBodyDescription(gender, targetBodyFat);

      // 身份锚点占位（§3.2）：未接入 UserIdentityProfile 表时，引用 reference 照片自动锁脸。
      // 接入身份锚点提取后，此字符串应替换为 UserIdentityProfile.identityAnchors。
      const identityAnchors =
        'the same face, hair style, skin tone, eyewear, and ethnicity as the reference photo';
      // 原图穿着占位（§3.1 {{originalOutfit}}）——同理，接入视觉提取后替换。
      const originalOutfit = 'same clothing as in the base photo';

      // ── §3.4 模板 B（固定文案，仅插值变量；禁止 LLM 改写）──
      const prompt = [
        'Photorealistic body transformation of the EXACT same person shown in the reference photo.',
        'Keep these identity features ABSOLUTELY IDENTICAL — do NOT alter them in any way:',
        `${identityAnchors}, same facial features and bone structure, same height and body frame.`,
        '',
        `This is a ${age}-year-old ${genderWord} currently at approximately ${currentBodyFat}% body fat.`,
        `Transform the body to ${targetBodyFat}% body fat.`,
        bodyDescriptionByTarget,
        'The change should be natural and believable as realistic fitness progress.',
        '',
        'Strict constraints:',
        '- ONLY change body composition (reduce fat). Identity, skin color, hair, glasses,',
        `  clothing (${originalOutfit}), posture, and background MUST stay identical to the base photo.`,
        `- Do NOT swap faces. Do NOT change ethnicity. Do NOT go below ${targetBodyFat}% body fat.`,
        '- Natural skin texture, realistic soft shadows, no plastic/smoothed/waxed look.',
        '- Full body visible, standing relaxed, same camera angle as base photo.',
        '',
        'Style: ultra-realistic photography, soft natural daylight, sharp focus, 8K detail.',
        'Output a single realistic photo.',
      ].join('\n');

      // base = 最新照；reference = 起点照（多图融合保留身份轨迹）
      const baseDataUrl = await this.imageUrlToDataUrl(recordImageUrl);
      let referenceDataUrl: string | undefined;
      if (startRecord?.imageUrl && startRecord.imageUrl !== recordImageUrl) {
        try {
          referenceDataUrl = await this.imageUrlToDataUrl(startRecord.imageUrl);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown';
          this.logger.warn(`Failed to load start reference image: ${message}`);
        }
      }

      const result = await this.imageGenService.generateIdealBody(userId, {
        prompt,
        currentImageBase64: baseDataUrl,
        referenceImageBase64: referenceDataUrl,
      });

      if (!result.image) {
        return;
      }

      const savedUrl = this.saveBase64Image(result.image);

      await this.prisma.evolutionStage.update({
        where: { id: nextStage.id },
        data: { previewImageUrl: savedUrl },
      });

      this.logger.log(
        `Generated stage preview for stage ${nextStage.stageIndex} (user ${userId}, ` +
          `${currentBodyFat}% → ${targetBodyFat}%)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Stage preview generation failed: ${message}`);
    }
  }

  // §3.5 bodyDescriptionByTarget 查表（性别 × 目标体脂区间）
  private lookupBodyDescription(gender: 'male' | 'female', targetBodyFat: number): string {
    if (gender === 'female') {
      if (targetBodyFat >= 32) {
        return 'Soft curves, fuller waist and thighs, no muscle lines.';
      }
      if (targetBodyFat >= 27) {
        return 'Slightly more defined waist, smoother silhouette, natural tone.';
      }
      if (targetBodyFat >= 23) {
        return 'Slimmer waist, light arm tone, firmer legs, healthy athletic shape.';
      }
      if (targetBodyFat >= 20) {
        return 'Toned arms and legs, flat toned stomach, healthy definition.';
      }
      // 18–19（女性下限 18%，§2.1）
      return 'Athletic and lean, defined muscle tone.';
    }

    // male
    if (targetBodyFat >= 25) {
      return 'Still soft midsection, rounded belly, minimal muscle definition, noticeable fat on arms and legs.';
    }
    if (targetBodyFat >= 20) {
      return 'Flatter stomach beginning to show shape, faint waist outline, no visible abs, smoother arms.';
    }
    if (targetBodyFat >= 16) {
      return 'Clearly flatter firmer stomach, slight arm definition, sharper jawline, leaner face.';
    }
    if (targetBodyFat >= 13) {
      return 'Visible abdominal outline, defined arms and shoulders, athletic look.';
    }
    // 10–12（男性目标 12%）
    return 'Clear abdominal definition (4-pack), vascular arms, sharp jawline, athletic V-taper.';
  }

  private async imageUrlToDataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${imageUrl}`);
      }
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

    await this.prisma.evolutionStage.updateMany({
      where: {
        userId,
        stageIndex: 0,
        isUnlocked: false,
      },
      data: {
        isUnlocked: true,
        unlockedAt: new Date(),
      },
    });

    await this.prisma.evolutionStage.updateMany({
      where: {
        userId,
        stageIndex: 0,
        qualifiedCount: { lt: QUALIFIED_REQUIRED },
      },
      data: {
        qualifiedCount: QUALIFIED_REQUIRED,
      },
    });

    if (stageZeroPreviewImage) {
      await this.prisma.evolutionStage.updateMany({
        where: {
          userId,
          stageIndex: 0,
          NOT: {
            previewImageUrl: stageZeroPreviewImage,
          },
        },
        data: {
          previewImageUrl: stageZeroPreviewImage,
        },
      });
    }
  }

  private async resolveStageEndpoints(
    userId: string,
    gender: string | null,
  ): Promise<{ start: number; target: number }> {
    // 起点体脂率 = 用户**首次**评估值（onboarding 时写入），不是最新值。
    // 这样七阶段目标曲线一旦订下来就不再随用户进度漂移，保证激励一致性。
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

  private async checkUnlock(
    userId: string,
    bodyFat: number,
    latestImageUrl: string | null,
    assessedAt: Date,
  ) {
    const stage = await this.prisma.evolutionStage.findFirst({
      where: {
        userId,
        isUnlocked: false,
      },
      orderBy: {
        stageIndex: 'asc',
      },
    });

    if (!stage) {
      return;
    }

    if (bodyFat > stage.targetBodyFat) {
      if (stage.qualifiedCount > 0 || stage.lastQualifiedAt) {
        await this.prisma.evolutionStage.update({
          where: { id: stage.id },
          data: {
            qualifiedCount: 0,
            lastQualifiedAt: null,
          },
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
          data: {
            qualifiedCount: 1,
          },
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

    await this.prisma.evolutionStage.update({
      where: { id: stage.id },
      data,
    });
  }

  private buildStageTargets(
    gender: string | null,
    start?: number,
    target?: number,
  ): number[] {
    const safeStart = start ?? (gender === 'female' ? 35 : 25);
    const safeTarget = target ?? this.calculateTargetBodyFat(gender);

    // §2.1 减速曲线：真实减脂"前快后慢"，按累计进度 p 插值
    // 目标体脂[i] = 起始体脂 − (起始体脂 − 目标体脂) × p[i]
    const span = safeStart - safeTarget;
    return Array.from({ length: STAGE_COUNT }, (_, index) => {
      const p = STAGE_PROGRESS[index] ?? index / (STAGE_COUNT - 1);
      const value = safeStart - span * p;
      return Number(value.toFixed(1));
    });
  }

  private calculateTargetBodyFat(gender: string | null): number {
    return gender === 'female' ? 20 : 12;
  }

  private async getLatestGeneratedIdealImage(userId: string): Promise<string | undefined> {
    const task = await this.prisma.imageGenTask.findFirst({
      where: {
        userId,
        status: 'completed',
        resultImageUrl: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { resultImageUrl: true },
    });

    return this.normalizeImageUrl(task?.resultImageUrl);
  }

  private normalizeImageUrl(imageUrl: string | null | undefined): string | undefined {
    if (!imageUrl) {
      return undefined;
    }

    const normalized = imageUrl.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeBodyFat(value: number): number {
    return Number(Math.max(3, Math.min(60, value)).toFixed(1));
  }

  private calculateBodyFatFromUser(user: UserSnapshot | null | undefined): number {
    if (!user) {
      return 25;
    }

    if (
      !user.weight ||
      !user.height ||
      user.weight <= 0 ||
      user.height <= 0
    ) {
      return user.gender === 'female' ? 35 : 25;
    }

    const bmi = user.weight / Math.pow(user.height / 100, 2);
    if (!Number.isFinite(bmi)) {
      return user.gender === 'female' ? 35 : 25;
    }

    const age = user.age && user.age > 0 ? user.age : 30;
    const estimated =
      user.gender === 'female'
        ? 1.2 * bmi + 0.23 * age - 5.4
        : 1.2 * bmi + 0.23 * age - 16.2;

    return this.normalizeBodyFat(estimated);
  }
}
