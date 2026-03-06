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
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
});

const getShanghaiDateString = (): string => SHANGHAI_DATE_FORMATTER.format(new Date());
@Injectable()
export class TodosService {
  private readonly defaultTodos = [
    { title: 'Log meals', category: 'diet' },
    { title: 'Drink more water', category: 'water' },
    { title: 'Complete training plan', category: 'training' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  private isCoachProgressMetadata(metadata: unknown): boolean {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return false;
    }
    const record = metadata as { source?: unknown };
    return record.source === 'ai-coach-progress';
  }

  private mapCoachTaskCategory(category: unknown, title?: string, detail?: string): string {
    if (category === 'nutrition') {
      return 'diet';
    }

    if (category === 'recovery') {
      const text = `${title ?? ''} ${detail ?? ''}`.toLowerCase();
      if (
        text.includes('water') ||
        text.includes('drink') ||
        text.includes('hydration') ||
        text.includes('ml') ||
        text.includes('喝水') ||
        text.includes('补水')
      ) {
        return 'water';
      }
      return 'training';
    }

    if (category === 'training' || category === 'habit') {
      return 'training';
    }

    return 'training';
  }

  private buildTodosFromProgressPlan(activePlan: unknown): Array<{
    title: string;
    category: string;
    metadata: unknown;
  }> {
    if (!activePlan || typeof activePlan !== 'object' || Array.isArray(activePlan)) {
      return [];
    }

    const plan = activePlan as { tasks?: unknown[] };
    if (!Array.isArray(plan.tasks)) {
      return [];
    }

    const todos: Array<{
      title: string;
      category: string;
      metadata: unknown;
    }> = [];

    const seenTitles = new Set<string>();

    for (const task of plan.tasks) {
      if (!task || typeof task !== 'object' || Array.isArray(task)) {
        continue;
      }

      const taskRecord = task as {
        id?: unknown;
        title?: unknown;
        category?: unknown;
        detail?: unknown;
      };

      const title =
        typeof taskRecord.title === 'string' ? taskRecord.title.trim() : '';
      if (!title) {
        continue;
      }

      // 去重：如果已经有相同标题的任务，跳过
      if (seenTitles.has(title)) {
        continue;
      }
      seenTitles.add(title);

      const detail =
        typeof taskRecord.detail === 'string' ? taskRecord.detail.trim() : '';

      todos.push({
        title,
        category: this.mapCoachTaskCategory(taskRecord.category, title, detail),
        metadata: {
          source: 'ai-coach-progress',
          coachTaskId: typeof taskRecord.id === 'string' ? taskRecord.id : null,
          coachTaskCategory:
            typeof taskRecord.category === 'string'
              ? taskRecord.category
              : 'training',
          detail,
        },
      });
    }

    return todos;
  }

  async list(userId: string, date?: string) {
    const targetDate = date || getShanghaiDateString();
    await this.ensureDailyTodos(userId, targetDate);

    const records = await this.prisma.todo.findMany({
      where: {
        userId,
        date: targetDate,
      },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async create(userId: string, body: { title: string; category: string; date?: string }) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    if (!body.category?.trim()) {
      throw new BadRequestException('category is required');
    }

    const record = await this.prisma.todo.create({
      data: {
        userId,
        title: body.title.trim(),
        category: body.category.trim(),
        date: body.date || getShanghaiDateString(),
      },
    });

    return this.mapRecord(record);
  }

  async update(
    userId: string,
    id: string,
    body: { title?: string; category?: string; completed?: boolean },
  ) {
    const existing = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Todo not found');
    }

    const record = await this.prisma.todo.update({
      where: { id },
      data: {
        title: body.title?.trim() || undefined,
        category: body.category?.trim() || undefined,
        completed:
          typeof body.completed === 'boolean' ? body.completed : undefined,
      },
    });

    return this.mapRecord(record);
  }

  async toggle(userId: string, id: string) {
    const existing = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Todo not found');
    }

    const record = await this.prisma.todo.update({
      where: { id },
      data: {
        completed: !existing.completed,
        completedSource: !existing.completed ? 'manual' : null,
        completedAt: !existing.completed ? new Date() : null,
      },
    });

    return this.mapRecord(record);
  }

  async ensureDailyTodos(userId: string, date: string) {
    const existingTodos = await this.prisma.todo.findMany({
      where: { userId, date },
      select: { id: true, metadata: true },
    });

    const progress = await this.prisma.aiCoachProgress.findUnique({
      where: { userId },
      select: { activePlan: true },
    });

    const progressTodos = this.buildTodosFromProgressPlan(progress?.activePlan);
    if (progressTodos.length > 0) {
      if (existingTodos.length > 0) {
        const hasCoachTodos = existingTodos.some((todo) =>
          this.isCoachProgressMetadata(todo.metadata),
        );
        if (hasCoachTodos) {
          return;
        }

        await this.prisma.todo.deleteMany({
          where: { userId, date },
        });
      }

      await this.prisma.todo.createMany({
        data: progressTodos.map((todo) => ({
          userId,
          date,
          title: todo.title,
          category: todo.category,
          metadata: todo.metadata as any,
        })),
      });
      return;
    }

    if (existingTodos.length > 0) {
      return;
    }

    const profile = await this.prisma.aiCoachProfile.findUnique({
      where: { userId },
      select: { fitnessPlan: true, hydrationPlan: true, mealPlan: true }
    });

    const todos = [];

    if (profile?.fitnessPlan) {
      const plan = profile.fitnessPlan as any;
      const weeklyPlan = Array.isArray(plan?.weeklyTrainingPlan)
        ? plan.weeklyTrainingPlan
        : [];
      const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
      const coachDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      const dayPlan =
        weeklyPlan.find((item: any) => Number(item?.day) === coachDay) ||
        weeklyPlan[0];
      const dayTasks = Array.isArray(dayPlan?.tasks)
        ? dayPlan.tasks.filter((task: any) => typeof task === 'string' && task.trim())
        : [];

      if (dayTasks.length > 0) {
        todos.push({
          title: `完成今日训练：${dayTasks.slice(0, 4).join('、')}`,
          category: 'training',
          metadata: {
            focus: dayPlan?.focus ?? null,
            durationMinutes: dayPlan?.durationMinutes ?? null,
            tasks: dayTasks,
          },
        });
      }
    }

    if (profile?.hydrationPlan) {
      const plan = profile.hydrationPlan as any;
      const dailyTarget = Number(plan?.dailyTargetMl ?? plan?.dailyTarget ?? 2000);
      todos.push({
        title: `喝水 ${dailyTarget}ml`,
        category: 'water',
        metadata: { target: dailyTarget }
      });
    }

    if (profile?.mealPlan) {
      todos.push({
        title: '记录今日饮食',
        category: 'diet',
        metadata: {}
      });
    }

    if (todos.length > 0) {
      await this.prisma.todo.createMany({
        data: todos.map(t => ({ userId, date, ...t }))
      });
    } else {
      await this.ensureDefaults(userId, date);
    }
  }

  async autoComplete(userId: string, category: string, date: string) {
    const todo = await this.prisma.todo.findFirst({
      where: { userId, category, date, completed: false }
    });

    if (!todo) return null;

    return await this.prisma.todo.update({
      where: { id: todo.id },
      data: {
        completed: true,
        completedSource: 'auto',
        completedAt: new Date()
      }
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.todo.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Todo not found');
    }

    await this.prisma.todo.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private async ensureDefaults(userId: string, date: string) {
    const count = await this.prisma.todo.count({
      where: { userId, date },
    });

    if (count > 0) {
      return;
    }

    await this.prisma.todo.createMany({
      data: this.defaultTodos.map((item) => ({
        userId,
        date,
        title: item.title,
        category: item.category,
      })),
    });
  }

  private mapRecord(record: {
    id: string;
    title: string;
    category: string;
    date: string;
    completed: boolean;
  }) {
    return {
      id: record.id,
      title: record.title,
      category: record.category,
      date: record.date,
      completed: record.completed,
    };
  }
}

@Controller('todos')
@UseGuards(JwtAuthGuard)
class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  list(@CurrentUser() user: { sub: string }, @Query('date') date?: string) {
    return this.todosService.list(user.sub, date);
  }

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() body: { title: string; category: string; date?: string },
  ) {
    return this.todosService.create(user.sub, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() body: { title?: string; category?: string; completed?: boolean },
  ) {
    return this.todosService.update(user.sub, id, body);
  }

  @Patch(':id/toggle')
  toggle(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.todosService.toggle(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.todosService.remove(user.sub, id);
  }

  @Get('ensure-daily')
  ensureDailyTodos(
    @CurrentUser() user: { sub: string },
    @Query('date') date?: string
  ) {
    const targetDate = date || getShanghaiDateString();
    return this.todosService.ensureDailyTodos(user.sub, targetDate);
  }

  @Post('auto-complete')
  autoComplete(
    @CurrentUser() user: { sub: string },
    @Body() body: { category: string; date: string }
  ) {
    return this.todosService.autoComplete(user.sub, body.category, body.date);
  }
}

@Module({
  controllers: [TodosController],
  providers: [TodosService],
  exports: [TodosService],
})
export class TodosModule {}
