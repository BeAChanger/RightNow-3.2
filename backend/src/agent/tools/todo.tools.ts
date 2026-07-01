import { ToolHandler } from './tool-registry';
import { TodosService } from '../../todos/todos.module';

export function todoTools(todos: TodosService): ToolHandler[] {
  return [
    {
      name: 'todo.today.list',
      write: false,
      async run(ctx) {
        const date = (ctx.args.date as string) ?? undefined;
        return todos.list(ctx.userId!, date);
      },
    },
    {
      name: 'todo.complete',
      write: true,
      async run(ctx) {
        const a = ctx.args as any;
        if (a.id) {
          await todos.update(ctx.userId!, a.id, { completed: true });
          return { completed: true, id: a.id };
        }
        const date = (a.date as string) ?? undefined;
        return todos.autoComplete(ctx.userId!, a.category, date);
      },
    },
    {
      name: 'todo.create',
      write: true,
      async run(ctx) {
        const a = ctx.args as any;
        return todos.create(ctx.userId!, {
          title: a.title,
          category: a.category ?? 'other',
          date: a.date,
        });
      },
    },
  ];
}
