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

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: string;
}

export type NutritionData = FoodAnalysis;

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
  
  async estimateBeforeMeal(imageBase64: string): Promise<
    { estimated: any; advice: string; mealTypeGuess: string; warning?: string; processedAt: string }
  > {
    const { data } = await apiClient.post('/diet/estimate-before-meal', { imageBase64 });
    return data;
  },
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

function normalizeFoodAnalysis(payload: unknown): FoodAnalysis {
  const obj = asObject(payload);
  const nested = obj ? asObject(obj.data) : null;
  const source = nested || obj;

  return {
    name: typeof source?.name === 'string' ? source.name : '未知食物',
    calories: Math.round(toNumber(source?.calories)),
    protein: Math.round(toNumber(source?.protein)),
    fat: Math.round(toNumber(source?.fat)),
    carbs: Math.round(toNumber(source?.carbs)),
    mealType: typeof source?.mealType === 'string' ? source.mealType : '加餐',
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

  async analyzeText(body: { foodName: string; description?: string }): Promise<FoodAnalysis> {
    const { data } = await client.post<unknown>('/diet/analyze/text', body, { timeout: 60_000 });
    return normalizeFoodAnalysis(data);
  },

  async analyzeImage(imageBase64: string): Promise<FoodAnalysis> {
    const { data } = await client.post<unknown>('/diet/analyze/image', { imageBase64 }, { timeout: 90_000 });
    return normalizeFoodAnalysis(data);
  },
};
