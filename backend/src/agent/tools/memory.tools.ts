import { ToolHandler } from './tool-registry';
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

export function memoryTools(prisma: PrismaService): ToolHandler[] {
  return [
    {
      name: 'memory.context.assemble',
      write: false,
      async run(ctx) {
        const today = getShanghaiDate();

        const [user, profile, onboarding, todayDiet, todayTodos, weightRecords] =
          await Promise.all([
            prisma.user.findUnique({
              where: { id: ctx.userId! },
              select: {
                id: true,
                email: true,
                name: true,
                gender: true,
                height: true,
                weight: true,
                age: true,
                bodyStyle: true,
                goalWeight: true,
                activityLevel: true,
                isProfileComplete: true,
                currentPhase: true,
                userImage: true,
                userFaceImage: true,
                idealBodyImage: true,
              },
            }),
            prisma.aiCoachProfile.findUnique({
              where: { userId: ctx.userId! },
              select: { mealPlan: true, hydrationPlan: true, fitnessPlan: true },
            }),
            prisma.aiCoachOnboardingProfile.findUnique({
              where: { userId: ctx.userId! },
            }),
            prisma.dietRecord.aggregate({
              where: { userId: ctx.userId!, date: today },
              _sum: { calories: true, protein: true, fat: true, carbs: true },
            }),
            prisma.todo.findMany({
              where: { userId: ctx.userId!, date: today },
              select: { id: true, title: true, category: true, completed: true },
            }),
            prisma.weightRecord.findMany({
              where: { userId: ctx.userId! },
              orderBy: { date: 'desc' },
              take: 7,
              select: { date: true, weight: true },
            }),
          ]);

        return {
          user,
          profile,
          onboarding,
          today: {
            date: today,
            diet: todayDiet._sum,
            todos: todayTodos,
          },
          weightTrend: weightRecords.reverse(),
        };
      },
    },
  ];
}
