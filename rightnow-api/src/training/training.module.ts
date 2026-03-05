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
      rawInput?: any;
    },
  ) {
    const description = body.description?.trim() || 'Workout completed';
    const duration = this.parseOptionalInteger(body.duration);
    const date = body.date || new Date().toISOString().slice(0, 10);

    let structuredData = null;
    try {
      structuredData = await this.aiService.extractTrainingData({
        description: body.description,
        photoUrl: body.photoUrl,
        rawInput: body.rawInput
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

    if (structuredData?.exercises) {
      const setDetails = [];
      for (const exercise of structuredData.exercises) {
        for (let i = 0; i < exercise.sets.length; i++) {
          setDetails.push({
            trainingRecordId: record.id,
            exerciseName: exercise.name,
            setNumber: i + 1,
            reps: exercise.sets[i].reps,
            weight: exercise.sets[i].weight,
            duration: exercise.sets[i].duration,
            restTime: exercise.sets[i].restTime
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
            ...feedbackData
          }
        });
      } catch (error) {
        console.error('Feedback generation failed:', error);
      }
    }

    const fullRecord = await this.prisma.trainingRecord.findUniqueOrThrow({
      where: { id: record.id },
      include: { setDetails: true }
    });

    return {
      record: this.mapRecord(fullRecord),
      feedbackCard
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
      include: { setDetails: true }
    });

    if (records.length === 0) {
      throw new NotFoundException('No training records found for this date');
    }

    const lastRecord = await this.prisma.trainingRecord.findFirst({
      where: { userId, date: { lt: date } },
      orderBy: { date: 'desc' },
      include: { setDetails: true }
    });

    const prompt = `基于今日训练和历史数据，生成"今日变化"总结：

今日训练：
${JSON.stringify(records, null, 2)}

上次训练：
${lastRecord ? JSON.stringify(lastRecord, null, 2) : '无'}

要求：
1. 突出进步（重量提升、次数增加、新动作等）
2. 语气积极鼓励
3. 数据可视化建议

返回 JSON 格式（同反馈卡片结构）。只返回 JSON，不要其他文字。`;

    try {
      const feedbackData = await this.aiService.generateFeedback({ records, lastRecord });
      return await this.prisma.aiFeedbackCard.create({
        data: {
          userId,
          cardType: 'daily_change',
          ...feedbackData
        }
      });
    } catch (error) {
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
    body: { description?: string; duration?: number; photoUrl?: string; date?: string },
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
    @Query('date') date?: string
  ) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.trainingService.generateDailyChange(user.sub, targetDate);
  }

  @Get('feedback')
  listFeedbackCards(
    @CurrentUser() user: { sub: string },
    @Query('date') date?: string
  ) {
    return this.prisma.aiFeedbackCard.findMany({
      where: {
        userId: user.sub,
        ...(date && {
          createdAt: {
            gte: new Date(date),
            lt: new Date(date + 'T23:59:59')
          }
        })
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

@Module({
  imports: [AiModule, TodosModule],
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}
