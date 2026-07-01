import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TodosService } from '../todos/todos.module';

const MUSCLE_KEYWORDS: Record<string, string[]> = {
  chest: ['chest', 'bench', 'press', 'fly', 'push-up'],
  back: ['back', 'pull', 'row', 'deadlift', 'lat'],
  legs: ['legs', 'leg', 'squat', 'lunge', 'hamstring', 'quad', 'calf'],
  shoulders: ['shoulder', 'overhead', 'raise', 'deltoid'],
  arms: ['arm', 'bicep', 'tricep', 'curl', 'extension'],
  core: ['core', 'abs', 'plank', 'crunch', 'sit-up'],
};

const PROGRESSIVE_OVERLOAD_RULES = {
  step1: {
    name: 'Rep Target',
    description: 'Hit the top of the target rep range with good form before increasing load.',
  },
  step2: {
    name: 'Load Increase',
    description: 'Increase load by 2.5%-5% once rep target is stable.',
    compound: '+2.5kg to +5kg',
    isolation: '+1kg to +2.5kg',
  },
  step3: {
    name: 'Rebuild Reps',
    description: 'After adding load, reps may drop temporarily. Build reps back to target.',
  },
};

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

interface TodoLike {
  title: string;
  category: string;
}

interface SessionLogMessage {
  role: string;
  content: string;
}

@Injectable()
export class TrainingSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todosService: TodosService,
  ) {}

  async create(userId: string) {
    const today = getShanghaiDateString();
    const todayTodos = await this.todosService.list(userId, today);
    const trainingTodos = (todayTodos as TodoLike[]).filter(
      (todo) => todo.category === 'training',
    );

    const targetMuscle = this.detectTargetMuscle(trainingTodos);
    const lastCycleHistory = await this.getLastCycleSummary(userId, targetMuscle);

    return this.prisma.trainingSession.create({
      data: {
        userId,
        contextData: this.toInputJsonValue({
          todayTodos: trainingTodos,
          targetMuscle,
          lastCycleHistory,
          progressiveOverloadRules: PROGRESSIVE_OVERLOAD_RULES,
        }),
      },
    });
  }

  async findOne(sessionId: string, userId: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async updateLog(sessionId: string, userId: string, message: unknown) {
    const session = await this.findOne(sessionId, userId);
    if (session.status !== 'in_progress') {
      return session;
    }

    const normalizedMessage = this.normalizeLogMessage(message);
    if (!normalizedMessage) {
      return session;
    }

    const log = (Array.isArray(session.conversationLog)
      ? [...session.conversationLog]
      : []) as Prisma.InputJsonValue[];

    log.push(
      this.toInputJsonValue({
        ...normalizedMessage,
        timestamp: new Date().toISOString(),
      }),
    );

    return this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: { conversationLog: this.toInputJsonValue(log) },
    });
  }

  async complete(sessionId: string, userId: string, data: any) {
    const session = await this.findOne(sessionId, userId);

    if (session.status === 'completed' && session.trainingRecordId) {
      const existingRecord = await this.prisma.trainingRecord.findFirst({
        where: {
          id: session.trainingRecordId,
          userId,
        },
      });
      if (existingRecord) {
        return { trainingRecord: existingRecord };
      }
    }

    if (session.status !== 'in_progress') {
      throw new BadRequestException('Session is not in progress');
    }

    const description = this.normalizeRequiredText(data?.description, 'description');
    const duration = this.parseOptionalNonNegativeInt(data?.duration);
    const date = this.normalizeDate(data?.date);
    const photoUrl = this.normalizeOptionalText(data?.photoUrl);
    const todayFeeling = this.normalizeOptionalText(data?.todayFeeling);

    const trainingRecord = await this.prisma.trainingRecord.create({
      data: {
        userId,
        description,
        duration,
        photoUrl,
        date,
        todayFeeling,
        targetMuscle: this.getContextTargetMuscle(session.contextData),
      },
    });

    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endTime: new Date(),
        trainingRecordId: trainingRecord.id,
      },
    });

    await this.todosService.autoComplete(userId, 'training', trainingRecord.date);

    return { trainingRecord };
  }

  async cancel(sessionId: string, userId: string) {
    const session = await this.findOne(sessionId, userId);

    if (session.status === 'completed') {
      throw new BadRequestException('Completed session cannot be cancelled');
    }

    if (session.status === 'cancelled') {
      return { success: true };
    }

    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: { status: 'cancelled' },
    });

    return { success: true };
  }

  private toInputJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private getContextTargetMuscle(contextData: unknown): string | undefined {
    if (!contextData || typeof contextData !== 'object' || Array.isArray(contextData)) {
      return undefined;
    }

    const targetMuscle = (contextData as Record<string, unknown>).targetMuscle;
    return typeof targetMuscle === 'string' && targetMuscle.trim()
      ? targetMuscle
      : undefined;
  }

  private normalizeRequiredText(value: unknown, fieldName: string): string {
    const text = this.normalizeOptionalText(value);
    if (!text) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return text;
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseOptionalNonNegativeInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('duration must be a non-negative integer');
    }

    return parsed;
  }

  private normalizeDate(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return getShanghaiDateString();
    }

    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }

    return trimmed;
  }

  private normalizeLogMessage(value: unknown): SessionLogMessage | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const role = typeof (value as any).role === 'string' ? (value as any).role.trim() : '';
    const content = typeof (value as any).content === 'string' ? (value as any).content.trim() : '';

    if (!role || !content) {
      return null;
    }

    return { role, content };
  }

  private detectTargetMuscle(todos: TodoLike[]): string {
    for (const todo of todos) {
      const title = todo.title.toLowerCase();

      for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
        if (keywords.some((keyword) => title.includes(keyword))) {
          return muscle;
        }
      }
    }

    return 'general';
  }

  private async getLastCycleSummary(userId: string, targetMuscle: string) {
    if (targetMuscle === 'general') {
      return null;
    }

    const records = await this.prisma.trainingRecord.findMany({
      where: { userId, targetMuscle },
      orderBy: { date: 'desc' },
      take: 3,
      include: { setDetails: true },
    });

    if (records.length === 0) {
      return null;
    }

    return records.map((record) => ({
      date: record.date,
      description: record.description,
      duration: record.duration,
      sets: record.setDetails.length,
    }));
  }
}

