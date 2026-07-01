import client from './client';

export interface CheckInRecord {
  id: string;
  type: string;
  note?: string;
  createdAt: string;
}

export const checkinsApi = {
  async list(from?: string, to?: string): Promise<CheckInRecord[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await client.get<CheckInRecord[]>('/checkins', { params });
    return data;
  },

  async create(body: { type: string; note?: string }): Promise<CheckInRecord> {
    const { data } = await client.post<CheckInRecord>('/checkins', body);
    return data;
  },

  async latest(): Promise<CheckInRecord | null> {
    const { data } = await client.get<CheckInRecord | null>('/checkins/latest');
    return data;
  },
};
