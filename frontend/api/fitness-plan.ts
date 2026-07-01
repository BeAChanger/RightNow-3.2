import apiClient from './client';

export interface FitnessPlan {
  id: string;
  exerciseBase?: string;
  dietHabit?: string;
  sleepPattern?: string;
  occupation?: string;
  mealPlan?: string;
  waterPlan?: string;
  trainingPlan?: string;
  aiSummary?: string;
  createdAt: string;
}

export const fitnessPlanApi = {
  upsert: (data: Partial<FitnessPlan>) =>
    apiClient.post<FitnessPlan>('/api/fitness-plan', data).then(r => r.data),

  latest: () =>
    apiClient.get<FitnessPlan>('/api/fitness-plan').then(r => r.data),
};
