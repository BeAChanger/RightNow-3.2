export interface CreatePostDto {
  content: string;
  images?: string[];
  tags?: string[];
  visibility?: 'PUBLIC' | 'BUDDIES_ONLY';
  postType?: 'NORMAL' | 'PROGRESS_REPORT';
  sourceType?: 'MANUAL' | 'AI_DRAFT' | 'TRAINING_FEEDBACK';
  sourceRefId?: string;
  aiDraftPayload?: any;
}
