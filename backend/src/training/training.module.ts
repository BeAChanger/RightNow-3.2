import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AiModule } from '../ai/ai.module';
import { TodosModule, TodosService } from '../todos/todos.module';

const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getShanghaiDateString = (): string => {
  const parts = SHANGHAI_DATE_FORMATTER.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
};

@Injectable()
class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly todosService: TodosService,
  ) {}

  async list(userId: string, date?: string, targetMuscle?: string) {
    const records = await this.prisma.trainingRecord.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
        ...(targetMuscle ? { targetMuscle } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapRecord(record));
  }

  async create(
    userId: string,
    body: {
      description?: string;
      duration?: number;
      photoUrl?: string;
      date?: string;
      todayFeeling?: string;
      rawInput?: any;
    },
  ) {
    const description = body.description?.trim() || 'Workout completed';
    const duration = this.parseOptionalInteger(body.duration);
    const date = this.normalizeDate(body.date);

    let structuredData = null;
    try {
      structuredData = await this.aiService.extractTrainingData({
        description: body.description,
        photoUrl: body.photoUrl,
        rawInput: body.rawInput,
      });
    } catch (error) {
      console.error('AI extraction failed:', error);
    }

    const record = await this.prisma.trainingRecord.create({
      data: {
        userId,
        description,
        duration,
        photoUrl: body.photoUrl?.trim() || null,
        date,
        todayFeeling: body.todayFeeling?.trim() || null,
        rawInput: body.rawInput || null,
        structuredData,
      },
    });

    if (structuredData) {
      const exercises = this.extractExercises(structuredData);
      const setDetails = [];
      for (const exercise of exercises) {
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          setDetails.push({
            trainingRecordId: record.id,
            exerciseName: exercise.name,
            setNumber: i + 1,
            reps: this.parseOptionalTrainingInt(set.reps),
            weight: this.parseOptionalTrainingNumber(set.weight),
            duration: this.parseOptionalTrainingInt(set.duration),
            restTime: this.parseOptionalTrainingInt(set.restTime),
          });
        }
      }
      if (setDetails.length > 0) {
        await this.prisma.trainingSetDetail.createMany({ data: setDetails });
      }
    }

    await this.todosService.autoComplete(userId, 'training', date);

    let feedbackCard = null;
    if (structuredData) {
      try {
        const feedbackData = await this.aiService.generateFeedback(structuredData);
        feedbackCard = await this.prisma.aiFeedbackCard.create({
          data: {
            userId,
            trainingRecordId: record.id,
            cardType: 'training_feedback',
            ...feedbackData,
          },
        });
      } catch (error) {
        console.error('Feedback generation failed:', error);
      }
    }

    const fullRecord = await this.prisma.trainingRecord.findUniqueOrThrow({
      where: { id: record.id },
      include: { setDetails: true },
    });

    return {
      record: this.mapRecord(fullRecord),
      feedbackCard,
    };
  }

  async update(
    userId: string,
    id: string,
    body: { description?: string; duration?: number; photoUrl?: string; date?: string },
  ) {
    const existing = await this.prisma.trainingRecord.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Training record not found');
    }

    const record = await this.prisma.trainingRecord.update({
      where: { id },
      data: {
        description: body.description?.trim() || undefined,
        duration:
          body.duration === undefined
            ? undefined
            : this.parseOptionalInteger(body.duration),
        photoUrl:
          body.photoUrl === undefined ? undefined : body.photoUrl?.trim() || null,
        date: body.date ? this.normalizeDate(body.date) : undefined,
      },
    });

    return this.mapRecord(record);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.trainingRecord.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Training record not found');
    }

    await this.prisma.trainingRecord.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async generateDailyChange(userId: string, date: string) {
    const records = await this.prisma.trainingRecord.findMany({
      where: { userId, date },
      include: { setDetails: true },
    });

    if (records.length === 0) {
      throw new NotFoundException('No training records found for this date');
    }

    const lastRecord = await this.prisma.trainingRecord.findFirst({
      where: { userId, date: { lt: date } },
      orderBy: { date: 'desc' },
      include: { setDetails: true },
    });

    try {
      const feedbackData = await this.aiService.generateFeedback({ records, lastRecord });
      return await this.prisma.aiFeedbackCard.create({
        data: {
          userId,
          cardType: 'daily_change',
          ...feedbackData,
        },
      });
    } catch {
      throw new BadRequestException('Failed to generate daily change');
    }
  }

  private parseOptionalInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('duration must be a non-negative integer');
    }
    return parsed;
  }

  private parseOptionalTrainingInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  private parseOptionalTrainingNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number.parseFloat(String(value));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  private normalizeDate(date?: string): string {
    if (!date) {
      return getShanghaiDateString();
    }

    const trimmed = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    return trimmed;
  }

  private extractExercises(structuredData: any): Array<{
    name: string;
    sets: Array<{
      reps?: unknown;
      weight?: unknown;
      duration?: unknown;
      restTime?: unknown;
    }>;
  }> {
    const rawExercises = Array.isArray(structuredData?.exercises)
      ? structuredData.exercises
      : [];

    return rawExercises
      .map((exercise: any) => {
        const name = typeof exercise?.name === 'string' ? exercise.name.trim() : '';
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        return { name, sets };
      })
      .filter((exercise: { name: string; sets: Array<unknown> }) => exercise.name.length > 0 && exercise.sets.length > 0);
  }

  private mapRecord(record: {
    id: string;
    description: string;
    duration: number | null;
    photoUrl: string | null;
    date: string;
    createdAt?: Date;
    updatedAt?: Date;
    todayFeeling?: string | null;
    targetMuscle?: string | null;
  }) {
    return {
      id: record.id,
      description: record.description,
      duration: record.duration ?? undefined,
      photoUrl: record.photoUrl ?? undefined,
      date: record.date,
      createdAt: record.createdAt?.toISOString(),
      updatedAt: record.updatedAt?.toISOString(),
      todayFeeling: record.todayFeeling ?? undefined,
      targetMuscle: record.targetMuscle ?? undefined,
    };
  }
}

@Controller('training')
@UseGuards(JwtAuthGuard)
class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Query('date') date?: string, @Query('targetMuscle') targetMuscle?: string) {
    return this.trainingService.list(user.sub, date, targetMuscle);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body()
    body: {
      description?: string;
      duration?: number;
      photoUrl?: string;
      date?: string;
      todayFeeling?: string;
      rawInput?: any;
    },
  ) {
    return this.trainingService.create(user.sub, body);
  }

  @Put(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body()
    body: { description?: string; duration?: number; photoUrl?: string; date?: string },
  ) {
    return this.trainingService.update(user.sub, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.trainingService.remove(user.sub, id);
  }

  @Post('daily-change')
  generateDailyChange(
    @CurrentUser() user: { sub: string },
    @Query('date') date?: string,
  ) {
    const targetDate = date || getShanghaiDateString();
    return this.trainingService.generateDailyChange(user.sub, targetDate);
  }

  @Get('feedback')
  listFeedbackCards(
    @CurrentUser() user: { sub: string },
    @Query('date') date?: string,
  ) {
    return this.prisma.aiFeedbackCard.findMany({
      where: {
        userId: user.sub,
        ...(date && {
          createdAt: {
            gte: new Date(date),
            lt: new Date(date + 'T23:59:59'),
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Module({
  imports: [AiModule, TodosModule],
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}


