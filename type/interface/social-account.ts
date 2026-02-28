export type Platform = 'x' | 'instagram' | 'tiktok';
export type Tone = 'formal' | 'casual' | 'playful' | 'professional';

export interface SocialAccount {
  id: string;
  org_id: string;
  user_id: string | null;
  
  // Platform info
  platform: Platform;
  username: string;
  display_name: string | null;
  platform_user_id: string | null;
  avatar_url: string | null;
  follower_count: number;
  
  // OAuth tokens (encrypted - never exposed to client)
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string | null;
  
  // Brand Info
  brand_name: string | null;
  tone: Tone;
  writing_style: string | null;
  language: string;
  target_audience: string | null;
  brand_guidelines: string | null;
  do_not_post: string[] | null;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// For creating a new social account
export interface CreateSocialAccountInput {
  org_id: string;
  platform: Platform;
  username: string;
  display_name?: string;
  platform_user_id?: string;
  avatar_url?: string;
  follower_count?: number;
  brand_name?: string;
  tone?: Tone;
  writing_style?: string;
  language?: string;
  target_audience?: string;
  brand_guidelines?: string;
  do_not_post?: string[];
}

// For updating brand info
export interface UpdateBrandInfoInput {
  brand_name?: string;
  tone?: Tone;
  writing_style?: string;
  language?: string;
  target_audience?: string;
  brand_guidelines?: string;
  do_not_post?: string[];
}
