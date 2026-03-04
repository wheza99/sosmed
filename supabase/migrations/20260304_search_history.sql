-- Create search_history table for caching X API search results
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  
  -- Search parameters
  query TEXT NOT NULL,
  query_hash TEXT NOT NULL, -- SHA256 of query + params for deduplication
  max_results INTEGER DEFAULT 10,
  sort_order TEXT DEFAULT 'recency',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  
  -- Search results
  total_results INTEGER DEFAULT 0,
  posts JSONB DEFAULT '[]'::jsonb,
  users JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  account_used TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'), -- Cache for 1 hour
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_sort_order CHECK (sort_order IN ('recency', 'relevancy'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_org ON search_history(org_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query_hash ON search_history(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_history_cached ON search_history(cached_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_expires ON search_history(expires_at) WHERE expires_at > NOW();

-- Function to generate query hash
CREATE OR REPLACE FUNCTION generate_search_hash(
  p_query TEXT,
  p_max_results INTEGER,
  p_sort_order TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    sha256(
      (p_query || '|' || p_max_results::text || '|' || p_sort_order || '|' || 
       COALESCE(p_start_time::text, '') || '|' || COALESCE(p_end_time::text, ''))::bytea
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RLS Policies
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own search history
CREATE POLICY "Users can view own search history"
  ON search_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create search history
CREATE POLICY "Users can create search history"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own search history
CREATE POLICY "Users can delete own search history"
  ON search_history FOR DELETE
  USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE search_history IS 'Cache X API search results to reduce API calls and enable historical analysis';
COMMENT ON COLUMN search_history.query_hash IS 'SHA256 hash of query parameters for deduplication';
COMMENT ON COLUMN search_history.expires_at IS 'Cache expiration time (1 hour default)';
