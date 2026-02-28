export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'failed';

export interface Post {
  id: string;
  account_id: string;
  org_id: string;
  user_id: string | null;
  
  // Content
  content: string;
  media_urls: string[] | null;
  
  // Scheduling
  scheduled_at: string | null;
  posted_at: string | null;
  
  // Status
  status: PostStatus;
  
  // Platform response
  platform_post_id: string | null;
  error_message: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Relations (optional, populated on fetch)
  account?: {
    id: string;
    platform: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  insights?: PostInsight[];
}

// For creating a new post
export interface CreatePostInput {
  account_id: string;
  org_id: string;
  content: string;
  media_urls?: string[];
  scheduled_at?: string;
}

// For updating a post
export interface UpdatePostInput {
  content?: string;
  media_urls?: string[];
  scheduled_at?: string;
  status?: PostStatus;
}

// Import PostInsight type
import { PostInsight } from './insight';
