import apiClient from './client';

export type CoachGoalDirection = 'fat_loss' | 'recomposition' | 'muscle_gain';
export type CoachStage = 'foundation' | 'build' | 'cut' | 'maintain';

export interface CoachAssessment {
  id: string;
  bodyFatEstimate?: number | null;
  targetBodyFatEstimate?: number | null;
  bmi: number;
  bmr: number;
  tdee: number;
  goalDirection: CoachGoalDirection;
  targetWeeks: number;
  stage: CoachStage;
  notes?: string | null;
  isVisualAssessment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachAssessmentCalibrationInput {
  bodyFatEstimate?: number | null;
  targetBodyFatEstimate?: number | null;
  bmi?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  goalDirection?: CoachGoalDirection;
  targetWeeks?: number;
  stage?: CoachStage;
  notes?: string;
  isVisualAssessment?: boolean;
}

export interface CoachIntakePayload {
  trainingExperience: string;
  injuryHistory: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  trainingEnvironment?: string;
  equipmentList?: string[];
  timePreference?: string;
  timePreferenceOther?: string;
  dietPreference?: string;
  dietRestrictions?: string;
}

export interface CoachIntake {
  id: string;
  trainingExperience: string;
  injuryHistory: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface FirstDayPlanContext {
  assessment: CoachAssessment;
  intake?: CoachIntake | null;
  constraints: {
    minTrainingDays: number;
    hardRejectUnderMinDays: boolean;
    knowledgeDomains: Array<'nutrition' | 'exercise' | 'training' | 'metrics'>;
  };
}

export interface CoachTask {
  id: string;
  title: string;
  category: 'training' | 'nutrition' | 'recovery' | 'habit';
  detail: string;
  completed?: boolean;
}

export interface FirstDayPlan {
  headline: string;
  tasks: CoachTask[];
  nutritionNote: string;
  recoveryNote: string;
  coachMessage: string;
}

export interface FirstPlanSaveResult {
  saved: boolean;
  plan: FirstDayPlan;
  dayIndex: number;
}

export interface CoachProgress {
  dayIndex: number;
  streakDays: number;
  completedTasks: number;
  totalTasks: number;
  activePlan?: FirstDayPlan | null;
  weekSummaryReady: boolean;
}

export interface CoachProfilePlan {
  generatedAt: string;
  totalCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  weeklyTrainingPlan: Array<{
    day: number;
    focus: string;
    durationMinutes: number;
    tasks: string[];
  }>;
}

export interface CoachHydrationPlan {
  generatedAt: string;
  dailyTargetMl: number;
  schedule: Array<{ time: string; amountMl: number; note?: string }>;
}

export interface CoachMealPlan {
  generatedAt: string;
  dailyCalories: number;
  meals: Array<{
    name: string;
    time: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    suggestions: string[];
  }>;
}

export interface CoachProfile {
  userId: string;
  profileVersion: number;
  recommendationSummary: string | null;
  refreshReason: string | null;
  lastRefreshedAt: string;
  nextRefreshAt: string;
  assessmentSnapshot: unknown;
  intakeSnapshot: unknown;
  fitnessPlan: CoachProfilePlan;
  hydrationPlan: CoachHydrationPlan;
  mealPlan: CoachMealPlan;
}

export const aiCoachApi = {
  getAssessment: () =>
    apiClient.get<CoachAssessment>('/ai-coach/assessment').then((r) => r.data),

  updateAssessment: (data: CoachAssessmentCalibrationInput) =>
    apiClient.patch<CoachAssessment>('/ai-coach/assessment', data).then((r) => r.data),

  saveIntake: (data: CoachIntakePayload) =>
    apiClient.post<CoachIntake>('/ai-coach/intake', data).then((r) => r.data),

  prepareFirstPlan: () =>
    apiClient
      .post<FirstDayPlanContext>('/ai-coach/first-plan', { mode: 'prepare' })
      .then((r) => r.data),

  saveFirstPlan: (plan: FirstDayPlan) =>
    apiClient
      .post<FirstPlanSaveResult>('/ai-coach/first-plan', { mode: 'save', plan })
      .then((r) => r.data),

  getProgress: () =>
    apiClient.get<CoachProgress>('/ai-coach/progress').then((r) => r.data),

  getProfile: () =>
    apiClient.get<CoachProfile>('/ai-coach/profile').then((r) => r.data),

  getTodayWorkout: () =>
    apiClient.get<any>('/ai-coach/today-workout').then((r) => r.data),

  refreshProfile: () =>
    apiClient.post<CoachProfile>('/ai-coach/profile/refresh').then((r) => r.data),
};

// ── 完整建档 (Onboarding Profile) ──

export interface StrengthAnchor {
  exercise: string;
  weight: number;  // kg
  reps: number;
  nearFailure: boolean;
}

export interface OnboardingProfile {
  id: string;
  userId: string;
  trainingExperience: string | null;
  injuryHistory: string | null;
  weeklyTrainingDays: number | null;
  sessionDurationMinutes: number | null;
  trainingEnvironment: string | null;
  timePreference: string | null;
  equipmentList: string[];
  strengthAnchors: StrengthAnchor[] | null;
  dietEnvironment: string | null;
  typicalBreakfast: string | null;
  typicalLunch: string | null;
  typicalDinner: string | null;
  alcoholFrequency: string | null;
  snackFrequency: string | null;
  diningOutFrequency: string | null;
  sleepHours: number | null;
  sleepQuality: string | null;
  stressLevel: string | null;
  cardioType: string | null;
  cardioFrequency: string | null;
  stepsPerDay: number | null;
  motivationLevel: string | null;
  biggestChallenge: string | null;
  targetAreas: string[];
  goalDirection: string | null;
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingProfileInput {
  trainingExperience?: string | null;
  injuryHistory?: string | null;
  weeklyTrainingDays?: number | null;
  sessionDurationMinutes?: number | null;
  trainingEnvironment?: string | null;
  timePreference?: string | null;
  equipmentList?: string[];
  strengthAnchors?: StrengthAnchor[] | null;
  dietEnvironment?: string | null;
  typicalBreakfast?: string | null;
  typicalLunch?: string | null;
  typicalDinner?: string | null;
  alcoholFrequency?: string | null;
  snackFrequency?: string | null;
  diningOutFrequency?: string | null;
  sleepHours?: number | null;
  sleepQuality?: string | null;
  stressLevel?: string | null;
  cardioType?: string | null;
  cardioFrequency?: string | null;
  stepsPerDay?: number | null;
  motivationLevel?: string | null;
  biggestChallenge?: string | null;
  targetAreas?: string[];
  goalDirection?: string | null;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}

export const onboardingApi = {
  getProfile: () =>
    apiClient.get<OnboardingProfile | null>('/ai-coach/onboarding').then((r) => r.data),

  saveProfile: (data: OnboardingProfileInput) =>
    apiClient.post<OnboardingProfile>('/ai-coach/onboarding', data).then((r) => r.data),
};
