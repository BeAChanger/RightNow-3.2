export enum View {
  Login = 'LOGIN',
  Register = 'REGISTER',
  Splash = 'SPLASH',
  Onboarding = 'ONBOARDING',
  Dashboard = 'DASHBOARD',
  Evolution = 'EVOLUTION',
  Stats = 'STATS',
  Diet = 'DIET',
  Community = 'COMMUNITY',
  Profile = 'PROFILE',
  AIChat = 'AICHAT',
  EvolutionRecord = 'EVOLUTION_RECORD',
  EvolutionProgress = 'EVOLUTION_PROGRESS',
  CheckInType = 'CHECK_IN_TYPE',
  CheckInBody = 'CHECK_IN_BODY',
  CheckInSuccess = 'CHECK_IN_SUCCESS',
  CheckInShare = 'CHECK_IN_SHARE',
  EvolutionGallery = 'EVOLUTION_GALLERY',
  ActionCenter = 'ACTION_CENTER',
  WeightRecord = 'WEIGHT_RECORD',
  TodoList = 'TODO_LIST',
  TrainingLog = 'TRAINING_LOG',
  TrainingHistory = 'TRAINING_HISTORY',
  TrainingConfirm = 'TRAINING_CONFIRM',
  CommunityShare = 'COMMUNITY_SHARE',
  WechatSettings = 'WECHAT_SETTINGS'
}

export interface UserState {
  name: string;
  currentPhase: string; // A-Z
  targetWeight: number;
  currentWeight: number;
}

export interface Post {
  id: number;
  user: string;
  avatar: string;
  imageBefore: string;
  imageAfter: string;
  likes: number;
  comments: number;
  desc: string;
  tags: string[];
}

export interface AiFeedbackCard {
  id: string;
  cardType: 'training_feedback' | 'daily_change';
  title: string;
  content: string;
  highlights?: Record<string, any>;
  encouragement?: string;
  suggestions?: string;
  createdAt: string;
}

export interface TrainingSetDetail {
  id: string;
  exerciseName: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
}
