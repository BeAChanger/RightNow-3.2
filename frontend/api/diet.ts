import client from './client';

export interface DietRecord {
  id: string;
  name: string;
  calories: number;
  fat?: number;
  protein?: number;
  carbs?: number;
  date: string;
  mealType?: string;
}

export interface DietSummary {
  totalCalories: number;
  totalFat: number;
  totalProtein: number;
  totalCarbs: number;
}

export interface NutritionData {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface AnalyzePhotoResponse {
  draftId: string;
  photoUrl?: string;
  nutrition: NutritionData;
}

export interface AnalyzeTextResponse {
  draftId: string;
  nutrition: NutritionData;
}

export interface DietDailySummary {
  id: string;
  userId: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  recordCount: number;
}

export interface CalendarDate {
  date: string;
  hasRecords: boolean;
  totalCalories: number;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDietRecord(payload: unknown): DietRecord | null {
  const obj = asObject(payload);
  if (!obj || typeof obj.id !== 'string') {
    return null;
  }

  return {
    id: obj.id,
    name: typeof obj.name === 'string' ? obj.name : '',
    calories: toNumber(obj.calories),
    fat: obj.fat == null ? undefined : toNumber(obj.fat),
    protein: obj.protein == null ? undefined : toNumber(obj.protein),
    carbs: obj.carbs == null ? undefined : toNumber(obj.carbs),
    date: typeof obj.date === 'string' ? obj.date : new Date().toISOString().slice(0, 10),
    mealType: typeof obj.mealType === 'string' ? obj.mealType : undefined,
  };
}

function normalizeDietList(payload: unknown): DietRecord[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeDietRecord(item))
      .filter((item): item is DietRecord => item !== null);
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  const candidates = [obj.data, obj.items, obj.records];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    return candidate
      .map((item) => normalizeDietRecord(item))
      .filter((item): item is DietRecord => item !== null);
  }

  const single = normalizeDietRecord(obj);
  return single ? [single] : [];
}

function normalizeDietSummary(payload: unknown): DietSummary {
  const obj = asObject(payload);
  const nested = obj ? asObject(obj.data) : null;
  const source = nested || obj;

  if (!source) {
    return {
      totalCalories: 0,
      totalFat: 0,
      totalProtein: 0,
      totalCarbs: 0,
    };
  }

  return {
    totalCalories: toNumber(source.totalCalories),
    totalFat: toNumber(source.totalFat),
    totalProtein: toNumber(source.totalProtein),
    totalCarbs: toNumber(source.totalCarbs),
  };
}

export const dietApi = {
  async list(date?: string): Promise<DietRecord[]> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const { data } = await client.get<unknown>('/diet', { params });
    return normalizeDietList(data);
  },

  async summary(date?: string): Promise<DietSummary> {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    const { data } = await client.get<unknown>('/diet/summary', { params });
    return normalizeDietSummary(data);
  },

  async create(body: { name: string; calories: number; fat?: number; protein?: number; carbs?: number; date: string; mealType?: string }): Promise<DietRecord> {
    const { data } = await client.post<unknown>('/diet', body);
    const normalized = normalizeDietRecord(data);
    if (!normalized) {
      throw new Error('Invalid diet record response payload');
    }
    return normalized;
  },

  async update(id: string, body: Partial<DietRecord>): Promise<DietRecord> {
    const { data } = await client.put<unknown>(`/diet/${id}`, body);
    const normalized = normalizeDietRecord(data);
    if (!normalized) {
      throw new Error('Invalid diet record response payload');
    }
    return normalized;
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/diet/${id}`);
  },

  async analyzePhoto(file: File): Promise<AnalyzePhotoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await client.post<AnalyzePhotoResponse>('/diet/analyze-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async analyzeText(name: string, description?: string): Promise<AnalyzeTextResponse> {
    const { data } = await client.post<AnalyzeTextResponse>('/diet/analyze-text', { name, description });
    return data;
  },

  async confirmRecord(draftId: string, nutrition: NutritionData): Promise<{ record: DietRecord; summary: DietDailySummary }> {
    const { data } = await client.post<any>('/diet/records', { draftId, ...nutrition });
    return data;
  },

  async deleteRecord(id: string): Promise<{ summary: DietDailySummary }> {
    const { data } = await client.delete<any>(`/diet/records/${id}`);
    return data;
  },

  async getRecords(date: string): Promise<{ records: DietRecord[]; summary: DietDailySummary | null }> {
    const { data } = await client.get<any>('/diet/records', { params: { date } });
    return data;
  },

  async getCalendar(startDate: string, endDate: string): Promise<{ dates: CalendarDate[] }> {
    const { data } = await client.get<any>('/diet/calendar', { params: { startDate, endDate } });
    return data;
  },
};

