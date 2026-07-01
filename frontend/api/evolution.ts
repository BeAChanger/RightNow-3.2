import client from './client';

export interface EvolutionRecord {
  id: string;
  imageUrl: string;
  weight?: number;
  status?: string;
  note?: string;
  createdAt: string;
}

export const evolutionApi = {
  async list(): Promise<EvolutionRecord[]> {
    const { data } = await client.get<EvolutionRecord[]>('/evolution');
    return data;
  },

  async create(formData: FormData): Promise<EvolutionRecord> {
    const { data } = await client.post<EvolutionRecord>('/evolution', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async update(id: string, body: { weight?: number; status?: string; note?: string }): Promise<EvolutionRecord> {
    const { data } = await client.patch<EvolutionRecord>(`/evolution/${id}`, body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/evolution/${id}`);
  },
};
