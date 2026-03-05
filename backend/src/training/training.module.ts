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
import { AiModule } from '../ai/ai.module';
import { AiService } from '../ai/ai.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { TodosModule, TodosService } from '../todos/todos.module';

@Injectable()
class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly todosService: TodosService,
  ) {}

  async list(userId: string, date?: string) {
    const records = await this.prisma.trainingRecord.findMany({
      where: {
        userId,
        ...(date ? { date } : {}),
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
      rawInput?: unknown;
      conversationId?: string;
      workoutMode?: boolean;
    },
  ) {
    const description = body.description?.trim() || 'Workout completed';
    const duration = this.parseOptionalInteger(body.duration);
    const date = body.date || new Date().toISOString().slice(0, 10);

    let structuredData: any = null;
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
        rawInput: (body.rawInput as object) || null,
        structuredData,
        conversationId: body.conversationId || null,
        workoutMode: body.workoutMode || false,
      },
    });

    if (structuredData?.exercises) {
      const setDetails: Array<{
        trainingRecordId: string;
        exerciseName: string;
        setNumber: number;
        reps: number | null;
        weight: number | null;
        duration: number | null;
        restTime: number | null;
      }> = [];

      for (const exercise of structuredData.exercises) {
        for (let i = 0; i < exercise.sets.length; i += 1) {
          setDetails.push({
            trainingRecordId: record.id,
            exerciseName: exercise.name,
            setNumber: i + 1,
            reps: exercise.sets[i].reps,
            weight: exercise.sets[i].weight,
            duration: exercise.sets[i].duration,
            restTime: exercise.sets[i].restTime,
          });
        }
      }

      if (setDetails.length > 0) {
        await this.prisma.trainingSetDetail.createMany({ data: setDetails });
      }
    }

    await this.todosService.autoComplete(userId, 'training', date);

    let feedbackCard: any = null;
    if (structuredData) {
      try {
        const feedbackData = await this.aiService.generateFeedback(structuredData, 'training.generate_feedback');
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
        date: body.date || undefined,
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
      const feedbackData = await this.aiService.generateFeedback(
        { records, lastRecord },
        'training.daily_change_feedback',
      );

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

  async extractFromConversation(userId: string, messages: Array<{ role: string; content: string }>) {
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `从以下对话中提取训练数据，返回JSON格式：
{
  "exercises": [
    {
      "name": "动作名称",
      "sets": 组数,
      "reps": 次数,
      "weight": 重量(kg),
      "notes": "备注"
    }
  ],
  "duration": 总时长(分钟),
  "feeling": "训练感受"
}

对话内容：
${conversationText}`;

    try {
      const result = await this.aiService.requestGemini(prompt, { temperature: 0.3, maxOutputTokens: 1024 });
      return JSON.parse(result);
    } catch (error) {
      console.error('Extraction failed:', error);
      return { exercises: [], duration: null, feeling: '' };
    }
  }

  async getCalendar(userId: string, startDate: string, endDate: string) {
    const records = await this.prisma.trainingRecord.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        date: true,
        duration: true,
        structuredData: true,
      },
    });

    const dateMap = new Map<string, { duration: number; exerciseCount: number }>();

    for (const record of records) {
      const existing = dateMap.get(record.date) || { duration: 0, exerciseCount: 0 };
      existing.duration += record.duration || 0;
      existing.exerciseCount += (record.structuredData as any)?.exercises?.length || 0;
      dateMap.set(record.date, existing);
    }

    const dates: Array<{
      date: string;
      hasTraining: boolean;
      totalDuration: number;
      exerciseCount: number;
    }> = [];

    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const data = dateMap.get(dateStr);

      dates.push({
        date: dateStr,
        hasTraining: !!data,
        totalDuration: data?.duration || 0,
        exerciseCount: data?.exerciseCount || 0,
      });

      current.setDate(current.getDate() + 1);
    }

    return { dates };
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

  private mapRecord(record: {
    id: string;
    description: string;
    duration: number | null;
    photoUrl: string | null;
    date: string;
  }) {
    return {
      id: record.id,
      description: record.description,
      duration: record.duration ?? undefined,
      photoUrl: record.photoUrl ?? undefined,
      date: record.date,
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
  list(@CurrentUser() user: { sub: string }, @Query('date') date?: string) {
    return this.trainingService.list(user.sub, date);
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
      rawInput?: unknown;
      conversationId?: string;
      workoutMode?: boolean;
    },
  ) {
    return this.trainingService.create(user.sub, body);
  }

  @Post('extract-from-conversation')
  extractFromConversation(
    @CurrentUser() user: { sub: string },
    @Body() body: { messages: Array<{ role: string; content: string }> },
  ) {
    return this.trainingService.extractFromConversation(user.sub, body.messages);
  }

  @Get('calendar')
  getCalendar(
    @CurrentUser() user: { sub: string },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.trainingService.getCalendar(user.sub, startDate, endDate);
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
    const targetDate = date || new Date().toISOString().slice(0, 10);
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
            lt: new Date(`${date}T23:59:59`),
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