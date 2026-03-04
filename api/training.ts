import client from './client';
import type { AiFeedbackCard, TrainingSetDetail } from '../types';

export interface TrainingRecord {
  id: string;
  description: string;
  duration?: number;
  photoUrl?: string;
  date: string;
  todayFeeling?: string;
  rawInput?: string;
  structuredData?: any;
  setDetails?: TrainingSetDetail[];
}

export const trainingApi = {
  async list(date?: string): Promise<TrainingRecord[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const { data } = await client.get<TrainingRecord[]>('/training', { params });
    return data;
  },

  async create(body: { description: string; duration?: number; todayFeeling?: string; photoUrl?: string; date?: string }): Promise<{ record: TrainingRecord; feedbackCard: AiFeedbackCard }> {
    const { data } = await client.post<{ record: TrainingRecord; feedbackCard: AiFeedbackCard }>('/training', body);
    return data;
  },

  async update(id: string, body: Partial<TrainingRecord>): Promise<TrainingRecord> {
    const { data } = await client.put<TrainingRecord>(`/training/${id}`, body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/training/${id}`);
  },

  async generateDailyChange(date: string): Promise<AiFeedbackCard> {
    const { data } = await client.post<AiFeedbackCard>('/training/daily-change', null, { params: { date } });
    return data;
  },

  async listFeedbackCards(date?: string): Promise<AiFeedbackCard[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const { data } = await client.get<AiFeedbackCard[]>('/training/feedback', { params });
    return data;
  },
};
