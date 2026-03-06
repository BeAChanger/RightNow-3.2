import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export interface StageItem {
  stageIndex: number;
  targetBodyFat: number;
  title: string;
  previewImageUrl?: string;
  isUnlocked: boolean;
  actualImageUrl?: string;
  qualifiedCount: number;
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

const STAGE_TITLES = [
  '\u5f53\u524d\u72b6\u6001',
  '\u521d\u59cb\u8fdb\u5c55',
  '\u6301\u7eed\u8fdb\u6b65',
  '\u53d8\u5316\u53ef\u89c1',
  '\u63a5\u8fd1\u76ee\u6807',
  '\u51b2\u523a\u9636\u6bb5',
  '\u76ee\u6807\u8eab\u6750',
] as const;

@Injectable()
export class EvolutionStageService {
  private readonly logger = new Logger(EvolutionStageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
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

    let bodyFat = this.calculateBodyFatFromUser(user);
    let geminiBodyFat: number | null = null;
    let isGeminiCalibrated = false;

    const shouldCalibrate = assessmentCount % 5 === 0;
    if (shouldCalibrate) {
      try {
        const estimated = await this.aiService.estimateBodyFatFromImage(record.imageUrl);
        if (Number.isFinite(estimated)) {
          geminiBodyFat = this.normalizeBodyFat(estimated);
          bodyFat = geminiBodyFat;
          isGeminiCalibrated = true;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(`Gemini calibration failed for ${record.id}: ${message}`);
      }
    }

    const normalizedBodyFat = this.normalizeBodyFat(bodyFat);

    try {
      const assessment = await this.prisma.evolutionAssessment.create({
        data: {
          userId,
          recordId: record.id,
          bodyFatEstimate: normalizedBodyFat,
          geminiBodyFat,
          isGeminiCalibrated,
          assessmentCount,
        },
        select: {
          createdAt: true,
        },
      });

      await this.checkUnlock(userId, normalizedBodyFat, record.imageUrl, assessment.createdAt);

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

  private async initializeStages(userId: string, gender: string | null) {
    const targets = this.buildStageTargets(gender);
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

  private buildStageTargets(gender: string | null): number[] {
    const start = gender === 'female' ? 35 : 25;
    const target = this.calculateTargetBodyFat(gender);

    return Array.from({ length: STAGE_COUNT }, (_, index) => {
      if (index === 0) {
        return Number(start.toFixed(1));
      }

      if (index === STAGE_COUNT - 1) {
        return Number(target.toFixed(1));
      }

      const interval = (start - target) / (STAGE_COUNT - 1);
      return Number((start - interval * index).toFixed(1));
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
