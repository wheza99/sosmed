-- Create search_history table for tracking agent search activity
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  
  -- Search parameters
  query TEXT NOT NULL,
  max_results INTEGER DEFAULT 10,
  sort_order TEXT DEFAULT 'recency',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Search results (for audit trail)
  total_results INTEGER DEFAULT 0,
  posts JSONB DEFAULT '[]'::jsonb,
  users JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  account_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_sort_order CHECK (sort_order IN ('recency', 'relevancy'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_org ON search_history(org_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_account ON search_history(account_id);

-- RLS Policies
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can view their org's search history
CREATE POLICY "Users can view org search history"
  ON search_history FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM api_keys 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Users can create search history
CREATE POLICY "Users can create search history"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE search_history IS 'Audit trail of agent search activity - allows users to see what searches their agents performed';
COMMENT ON COLUMN search_history.posts IS 'Snapshot of search results at the time of query';
COMMENT ON COLUMN search_history.users IS 'User profiles included in search results';

-- Add post_metrics table to track engagement over time
CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Metrics from platform
  retweet_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  
  -- Metadata
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_post_metric_time UNIQUE (post_id, fetched_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_fetched ON post_metrics(fetched_at DESC);

-- RLS
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org post metrics"
  ON post_metrics FOR SELECT
  USING (post_id IN (
    SELECT p.id FROM posts p
    JOIN social_accounts sa ON p.account_id = sa.id
    WHERE sa.org_id IN (
      SELECT org_id FROM api_keys 
      WHERE user_id = auth.uid() AND is_active = true
    )
  ));

COMMENT ON TABLE post_metrics IS 'Historical engagement metrics for posts - track performance over time';
