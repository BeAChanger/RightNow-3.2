import { ToolHandler } from './tool-registry';
import { DietService } from '../../diet/diet.service';

export function dietTools(diet: DietService): ToolHandler[] {
  return [
    {
      name: 'diet.summary.today',
      write: false,
      async run(ctx) {
        const date = (ctx.args.date as string) ?? undefined;
        return diet.summary(ctx.userId!, date);
      },
    },
    {
      name: 'diet.log.create',
      write: true,
      async run(ctx) {
        const a = ctx.args as any;
        return diet.create(ctx.userId!, {
          name: a.name,
          calories: a.calories,
          protein: a.protein,
          fat: a.fat,
          carbs: a.carbs,
          mealType: a.mealType,
          date: a.date,
        });
      },
    },
    {
      name: 'diet.recent.list',
      write: false,
      async run(ctx) {
        const date = (ctx.args.date as string) ?? undefined;
        return diet.list(ctx.userId!, date);
      },
    },
    {
      name: 'diet.analyze.text',
      write: false,
      async run(ctx) {
        const a = ctx.args as any;
        return diet.analyzeText({
          foodName: a.foodName,
          description: a.description,
        });
      },
    },
    {
      name: 'diet.analyze.image',
      write: false,
      async run(ctx) {
        const a = ctx.args as any;
        return diet.analyzeImage({ imageBase64: a.imageBase64 });
      },
    },
    {
      name: 'diet.gap.today',
      write: false,
      async run(ctx) {
        const date = (ctx.args.date as string) ?? undefined;
        const summary = await diet.summary(ctx.userId!, date);
        const profile = await (diet as any).prisma?.aiCoachProfile?.findUnique?.({ where: { userId: ctx.userId! } });
        // Use the diet service directly; gap calculation is optional
        return { summary, profile: profile ?? null };
      },
    },
  ];
}
