import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UploadService } from '../upload/upload.service';

interface ConfirmNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

@Injectable()
export class DietService {
  private readonly logger = new Logger(DietService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly uploadService: UploadService,
  ) {}

  private buildFallbackNutrition(nameHint?: string) {
    const baseName = (nameHint || '')
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .trim();

    return {
      name: baseName || '未命名食物',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };
  }

  async analyzePhoto(userId: string, file: Express.Multer.File) {
    const photoUrl = await this.uploadService.uploadFile(file, userId);
    let nutrition = this.buildFallbackNutrition(file?.originalname);

    try {
      const analyzed = await this.aiService.analyzeFoodPhoto(photoUrl);
      nutrition = {
        ...nutrition,
        ...analyzed,
      };
    } catch (error) {
      this.logger.warn(
        'analyzeFoodPhoto fallback used: ' +
          (error instanceof Error ? error.message : 'unknown error'),
      );
    }

    const draft = await this.prisma.dietRecord.create({
      data: {
        userId,
        name: nutrition.name || '未命名食物',
        calories: nutrition.calories,
        protein: nutrition.protein,
        fat: nutrition.fat,
        carbs: nutrition.carbs,
        date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        photoUrl,
        aiCalories: nutrition.calories,
        aiProtein: nutrition.protein,
        aiFat: nutrition.fat,
        aiCarbs: nutrition.carbs,
      },
    });

    return {
      draftId: draft.id,
      photoUrl: draft.photoUrl,
      nutrition: {
        calories: draft.calories,
        protein: draft.protein,
        fat: draft.fat,
        carbs: draft.carbs,
      },
    };
  }

  async analyzeText(userId: string, name: string, description?: string) {
    let nutrition = this.buildFallbackNutrition(name);

    try {
      const analyzed = await this.aiService.analyzeFoodText(name, description);
      nutrition = {
        ...nutrition,
        ...analyzed,
      };
    } catch (error) {
      this.logger.warn(
        'analyzeFoodText fallback used: ' +
          (error instanceof Error ? error.message : 'unknown error'),
      );
    }

    const draft = await this.prisma.dietRecord.create({
      data: {
        userId,
        name,
        calories: nutrition.calories,
        protein: nutrition.protein,
        fat: nutrition.fat,
        carbs: nutrition.carbs,
        date: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        aiCalories: nutrition.calories,
        aiProtein: nutrition.protein,
        aiFat: nutrition.fat,
        aiCarbs: nutrition.carbs,
      },
    });

    return {
      draftId: draft.id,
      nutrition: {
        calories: draft.calories,
        protein: draft.protein,
        fat: draft.fat,
        carbs: draft.carbs,
      },
    };
  }

  async confirmRecord(userId: string, draftId: string, nutrition: ConfirmNutrition) {
    const draft = await this.prisma.dietRecord.findFirst({
      where: { id: draftId, userId, status: 'DRAFT' },
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dietRecord.update({
        where: { id: draftId },
        data: {
          status: 'CONFIRMED',
          calories: nutrition.calories,
          protein: nutrition.protein,
          fat: nutrition.fat,
          carbs: nutrition.carbs,
        },
      });

      const summary = await this.updateDailySummary(tx, userId, draft.date);
      return { record: updated, summary };
    });

    return record;
  }

  async deleteRecord(userId: string, recordId: string) {
    const record = await this.prisma.dietRecord.findFirst({
      where: { id: recordId, userId },
    });

    if (!record) {
      throw new Error('Record not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.dietRecord.delete({ where: { id: recordId } });
      const summary = await this.updateDailySummary(tx, userId, record.date);
      return { summary };
    });

    return result;
  }

  async getRecords(userId: string, date: string) {
    const records = await this.prisma.dietRecord.findMany({
      where: { userId, date, status: 'CONFIRMED' },
      orderBy: { createdAt: 'desc' },
    });

    const summary = await this.prisma.dietDailySummary.findUnique({
      where: { userId_date: { userId, date } },
    });

    return { records, summary };
  }

  async getCalendar(userId: string, startDate: string, endDate: string) {
    const summaries = await this.prisma.dietDailySummary.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return {
      dates: summaries.map((s) => ({
        date: s.date,
        hasRecords: s.recordCount > 0,
        totalCalories: s.totalCalories,
      })),
    };
  }

  private async updateDailySummary(tx: any, userId: string, date: string) {
    const records: Array<{ calories: number; protein: number | null; fat: number | null; carbs: number | null }> = await tx.dietRecord.findMany({
      where: { userId, date, status: 'CONFIRMED' },
    });

    const totalCalories = records.reduce((sum: number, r) => sum + r.calories, 0);
    const totalProtein = records.reduce((sum: number, r) => sum + (r.protein || 0), 0);
    const totalFat = records.reduce((sum: number, r) => sum + (r.fat || 0), 0);
    const totalCarbs = records.reduce((sum: number, r) => sum + (r.carbs || 0), 0);

    return await tx.dietDailySummary.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        totalCalories,
        totalProtein,
        totalFat,
        totalCarbs,
        recordCount: records.length,
      },
      update: {
        totalCalories,
        totalProtein,
        totalFat,
        totalCarbs,
        recordCount: records.length,
      },
    });
  }
}
