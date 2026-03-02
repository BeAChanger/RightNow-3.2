export { default as apiClient, TOKEN_KEY, getApiErrorMessage } from './client';
export { authApi } from './auth';
export { weightApi } from './weight';
export { dietApi } from './diet';
export { trainingApi } from './training';
export { todosApi } from './todos';
export { checkinsApi } from './checkins';
export { evolutionApi } from './evolution';
export { postsApi } from './posts';
export { friendshipsApi } from './friendships';
export { chatApi } from './chat';
export { uploadApi } from './upload';
export { userApi } from './user';
export { imageGenApi } from './image-gen';
export { fitnessPlanApi } from './fitness-plan';
export { aiCoachApi } from './ai-coach';

// Re-export types
export type { AuthUser, AuthResponse } from './auth';
export type { WeightRecord } from './weight';
export type { DietRecord, DietSummary } from './diet';
export type { TrainingRecord } from './training';
export type { TodoItem } from './todos';
export type { CheckInRecord } from './checkins';
export type { EvolutionRecord } from './evolution';
export type { PostItem, Comment, PaginatedPosts } from './posts';
export type { Friendship } from './friendships';
export type { ChatMessage, PaginatedChat } from './chat';
export type { UploadResult } from './upload';
export type { UserProfile } from './user';
export type { ImageGenTask } from './image-gen';
export type { FitnessPlan } from './fitness-plan';
export type {
  CoachAssessment,
  CoachAssessmentCalibrationInput,
  CoachGoalDirection,
  CoachIntake,
  CoachMealPlan,
  CoachHydrationPlan,
  CoachProfile,
  CoachProfilePlan,
  CoachIntakePayload,
  CoachProgress,
  CoachStage,
  CoachTask,
  FirstDayPlan,
  FirstDayPlanContext,
  FirstPlanSaveResult,
} from './ai-coach';
