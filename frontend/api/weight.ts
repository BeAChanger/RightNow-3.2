import client from './client';

export interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  waist?: number;
  hip?: number;
}

export const weightApi = {
  async list(from?: string, to?: string): Promise<WeightRecord[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await client.get<WeightRecord[]>('/weight', { params });
    return data;
  },

  async create(body: { date: string; weight: number; waist?: number; hip?: number }): Promise<WeightRecord> {
    const { data } = await client.post<WeightRecord>('/weight', body);
    return data;
  },

  async update(id: string, body: { date: string; weight: number; waist?: number; hip?: number }): Promise<WeightRecord> {
    const { data } = await client.put<WeightRecord>(`/weight/${id}`, body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/weight/${id}`);
  },
};
