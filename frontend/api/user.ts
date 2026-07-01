import client from './client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  gender?: string;
  height?: number;
  weight?: number;
  age?: number;
  bodyStyle?: string;
  userImage?: string;
  userFaceImage?: string;
  idealBodyImage?: string;
  currentPhase?: string;
  goalWeight?: number;
  activityLevel?: string;
  isProfileComplete: boolean;
}

export const userApi = {
  async updateProfile(body: Partial<Omit<UserProfile, 'id' | 'email' | 'isProfileComplete'>>): Promise<UserProfile> {
    const { data } = await client.patch<UserProfile>('/users/profile', body);
    return data;
  },

  async onboarding(body: Partial<Omit<UserProfile, 'id' | 'email' | 'isProfileComplete'>>): Promise<UserProfile> {
    const { data } = await client.post<UserProfile>('/users/onboarding', body);
    return data;
  },

  async getUser(id: string): Promise<UserProfile> {
    const { data } = await client.get<UserProfile>(`/users/${id}`);
    return data;
  },
};
