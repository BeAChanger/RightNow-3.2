import client from './client';
import type { TodoItem } from './todos';

export interface TrainingSessionContext {
  todayTodos: TodoItem[];
  targetMuscle: string;
  lastCycleHistory: Array<{
    date: string;
    description: string;
    duration?: number | null;
    sets?: number;
  }> | null;
  progressiveOverloadRules: Record<string, unknown>;
}

export interface TrainingSession {
  id: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  conversationLog: Array<{ role: string; content: string; timestamp: string }>;
  contextData?: TrainingSessionContext;
  trainingRecordId?: string;
}

export const trainingSessionApi = {
  async create(): Promise<TrainingSession> {
    const { data } = await client.post<TrainingSession>('/training-sessions', {});
    return data;
  },

  async get(id: string): Promise<TrainingSession> {
    const { data } = await client.get<TrainingSession>(`/training-sessions/${id}`);
    return data;
  },

  async updateLog(id: string, message: { role: string; content: string }): Promise<void> {
    await client.patch(`/training-sessions/${id}`, { message });
  },

  async complete(
    id: string,
    formData: {
      description: string;
      duration: number;
      todayFeeling?: string;
      photoUrl?: string;
      date?: string;
    },
  ): Promise<any> {
    const { data } = await client.post(`/training-sessions/${id}/complete`, formData);
    return data;
  },

  async cancel(id: string): Promise<void> {
    await client.delete(`/training-sessions/${id}`);
  },
};
