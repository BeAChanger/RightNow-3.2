import client from './client';

export interface TodoItem {
  id: string;
  title: string;
  category: string;
  date: string;
  completed: boolean;
  completedSource?: 'manual' | 'auto';
  completedAt?: string;
  metadata?: any;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeTodoList(payload: unknown): TodoItem[] {
  if (Array.isArray(payload)) {
    return payload as TodoItem[];
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  if (Array.isArray(obj.data)) {
    return obj.data as TodoItem[];
  }

  if (Array.isArray(obj.items)) {
    return obj.items as TodoItem[];
  }

  return [];
}

function normalizeTodoItem(payload: unknown): TodoItem {
  const obj = asObject(payload);
  if (obj && typeof obj.id === 'string') {
    return obj as unknown as TodoItem;
  }

  const nested = obj ? asObject(obj.data) : null;
  if (nested && typeof nested.id === 'string') {
    return nested as unknown as TodoItem;
  }

  throw new Error('Invalid todo response payload');
}

export const todosApi = {
  async list(date?: string): Promise<TodoItem[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const { data } = await client.get<unknown>('/todos', { params });
    return normalizeTodoList(data);
  },

  async create(body: { title: string; category: string; date: string }): Promise<TodoItem> {
    const { data } = await client.post<unknown>('/todos', body);
    return normalizeTodoItem(data);
  },

  async update(id: string, body: { title?: string; category?: string; completed?: boolean }): Promise<TodoItem> {
    const { data } = await client.patch<unknown>(`/todos/${id}`, body);
    return normalizeTodoItem(data);
  },

  async toggle(id: string): Promise<TodoItem> {
    const { data } = await client.patch<unknown>(`/todos/${id}/toggle`);
    return normalizeTodoItem(data);
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/todos/${id}`);
  },

  async ensureDaily(date: string): Promise<void> {
    await client.get(`/todos/ensure-daily`, { params: { date } });
  },

  async autoComplete(category: string, date: string): Promise<TodoItem> {
    const { data } = await client.post<unknown>('/todos/auto-complete', { category, date });
    return normalizeTodoItem(data);
  },
};
