export enum View {
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
  EvolutionGallery = 'EVOLUTION_GALLERY'
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