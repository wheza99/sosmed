export interface PostInsight {
  id: string;
  post_id: string;
  
  // Metrics
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_rate: number;
  
  collected_at: string;
}

// For bulk insights data
export interface AccountInsights {
  account_id: string;
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_views: number;
  avg_engagement_rate: number;
  period_start: string;
  period_end: string;
}
