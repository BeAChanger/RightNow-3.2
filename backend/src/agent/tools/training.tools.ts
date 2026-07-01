import { ToolHandler } from './tool-registry';
import { TrainingSessionService } from '../../training-session/training-session.service';
import { PrismaService } from '../../prisma/prisma.service';

const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const getShanghaiDate = (): string => {
  const parts = SHANGHAI_DATE_FORMATTER.formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10);
};

export function trainingTools(
  trainingSessions: TrainingSessionService,
  prisma: PrismaService,
): ToolHandler[] {
  return [
    {
      name: 'training.plan.today',
      write: false,
      async run(ctx) {
        const date = (ctx.args.date as string) ?? getShanghaiDate();
        const todos = await prisma.todo.findMany({
          where: { userId: ctx.userId!, date, category: 'training' },
        });
        return todos;
      },
    },
    {
      name: 'training.session.start',
      write: true,
      async run(ctx) {
        return trainingSessions.create(ctx.userId!);
      },
    },
    {
      name: 'training.session.update',
      write: true,
      async run(ctx) {
        const a = ctx.args as any;
        return trainingSessions.updateLog(a.sessionId, ctx.userId!, a.message);
      },
    },
    {
      name: 'training.session.complete',
      write: true,
      async run(ctx) {
        const a = ctx.args as any;
        return trainingSessions.complete(a.sessionId, ctx.userId!, {
          description: a.description,
          duration: a.duration,
          date: a.date,
          photoUrl: a.photoUrl,
          todayFeeling: a.todayFeeling,
          rawInput: a.rawInput,
          targetMuscle: a.targetMuscle,
        });
      },
    },
    {
      name: 'training.recent.by_muscle',
      write: false,
      async run(ctx) {
        const muscle = (ctx.args.muscle as string) ?? undefined;
        const limit = (ctx.args.limit as number) ?? 5;
        return prisma.trainingRecord.findMany({
          where: {
            userId: ctx.userId!,
            ...(muscle ? { targetMuscle: muscle } : {}),
          },
          orderBy: { date: 'desc' },
          take: Math.min(Number(limit), 20),
        });
      },
    },
    {
      name: 'training.session.current',
      write: false,
      async run(ctx) {
        return prisma.trainingSession.findFirst({
          where: { userId: ctx.userId!, status: 'in_progress' },
          orderBy: { startTime: 'desc' },
        });
      },
    },
  ];
}
