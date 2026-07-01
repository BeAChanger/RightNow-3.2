import client from './client';

export interface EvolutionStage {
  stageIndex: number;
  targetBodyFat: number;
  title: string;
  previewImageUrl?: string;
  isUnlocked: boolean;
  actualImageUrl?: string;
  qualifiedCount: number;
}

export interface StageListResponse {
  stages: EvolutionStage[];
  currentBodyFat: number;
}

export interface AssessmentResponse {
  bodyFat: number;
  isGeminiCalibrated: boolean;
}

export interface PredictionResponse {
  days: number;
  predictedDate: string;
  targetStageIndex: number;
  targetBodyFat: number;
  currentBodyFat: number;
  scenario: string;
}

export interface NorthStarResponse {
  startBodyFat: number;
  targetBodyFat: number;
  stages: EvolutionStage[];
  northStarUrl?: string;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStage(stage: unknown): EvolutionStage | null {
  if (!stage || typeof stage !== 'object') {
    return null;
  }

  const value = stage as Record<string, unknown>;
  const stageIndex = toNumber(value.stageIndex);
  const targetBodyFat = toNumber(value.targetBodyFat);
  const qualifiedCount = toNumber(value.qualifiedCount) ?? 0;
  const title = typeof value.title === 'string' ? value.title.trim() : '';

  if (stageIndex == null || targetBodyFat == null || title.length === 0) {
    return null;
  }

  return {
    stageIndex,
    targetBodyFat,
    title,
    previewImageUrl: typeof value.previewImageUrl === 'string' ? value.previewImageUrl : undefined,
    actualImageUrl: typeof value.actualImageUrl === 'string' ? value.actualImageUrl : undefined,
    isUnlocked: Boolean(value.isUnlocked),
    qualifiedCount,
  };
}

function normalizeStageListResponse(payload: unknown): StageListResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid evolution-stage response payload.');
  }

  const value = payload as Record<string, unknown>;
  const stages = (Array.isArray(value.stages) ? value.stages : [])
    .map(normalizeStage)
    .filter((stage): stage is EvolutionStage => stage !== null)
    .sort((a, b) => a.stageIndex - b.stageIndex);

  if (stages.length === 0) {
    throw new Error('Evolution-stage payload contains no valid stages.');
  }

  return {
    stages,
    currentBodyFat: toNumber(value.currentBodyFat) ?? 0,
  };
}

function normalizeAssessmentResponse(payload: unknown): AssessmentResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid evolution-stage assessment response payload');
  }

  const value = payload as Record<string, unknown>;
  const bodyFat = toNumber(value.bodyFat) ?? 0;

  return {
    bodyFat,
    isGeminiCalibrated: Boolean(value.isGeminiCalibrated),
  };
}

function normalizePredictionResponse(payload: unknown): PredictionResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid evolution-stage prediction response payload');
  }

  const value = payload as Record<string, unknown>;
  return {
    days: toNumber(value.days) ?? 0,
    predictedDate: typeof value.predictedDate === 'string' ? value.predictedDate : '--',
    targetStageIndex: toNumber(value.targetStageIndex) ?? 1,
    targetBodyFat: toNumber(value.targetBodyFat) ?? 0,
    currentBodyFat: toNumber(value.currentBodyFat) ?? 0,
    scenario: typeof value.scenario === 'string' ? value.scenario : '当前轨迹',
  };
}

export const evolutionStageApi = {
  async list(): Promise<StageListResponse> {
    const { data } = await client.get<unknown>('/evolution-stage');
    return normalizeStageListResponse(data);
  },

  async assess(recordId: string): Promise<AssessmentResponse> {
    const { data } = await client.post<unknown>(`/evolution-stage/assess/${recordId}`);
    return normalizeAssessmentResponse(data);
  },

  async predict(proteinChangePercent = 0.1): Promise<PredictionResponse> {
    const { data } = await client.get<unknown>('/evolution-stage/prediction', {
      params: { proteinChangePercent },
    });
    return normalizePredictionResponse(data);
  },

  async northStar(startImageUrl: string): Promise<NorthStarResponse> {
    const { data } = await client.post<unknown>('/evolution-stage/north-star', { startImageUrl });
    return data as NorthStarResponse;
  },
};
