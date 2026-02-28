-- Sosmed Online Database Schema
-- Social Media Management Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations (Workspaces)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  image_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members (User-Organization relation)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- Social Accounts (Projects/Platforms)
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Platform info
  platform TEXT NOT NULL, -- 'x', 'instagram', 'tiktok'
  username TEXT NOT NULL,
  display_name TEXT,
  platform_user_id TEXT, -- Platform's user ID
  avatar_url TEXT,
  follower_count INTEGER DEFAULT 0,
  
  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Brand Info
  brand_name TEXT,
  tone TEXT DEFAULT 'professional', -- 'formal', 'casual', 'playful', 'professional'
  writing_style TEXT,
  language TEXT DEFAULT 'en',
  target_audience TEXT,
  brand_guidelines TEXT,
  do_not_post TEXT[], -- Topics to avoid
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, platform, username)
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Content
  content TEXT NOT NULL,
  media_urls TEXT[],
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
  
  -- Platform response
  platform_post_id TEXT, -- Platform's post ID
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Insights
CREATE TABLE IF NOT EXISTS post_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  
  -- Metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, collected_at)
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON members(org_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_org_id ON social_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_account_id ON posts(account_id);
CREATE INDEX IF NOT EXISTS idx_posts_org_id ON posts(org_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_post_insights_post_id ON post_insights(post_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id);

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members WHERE user_id = auth.uid() AND org_id = organizations.id
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Members policies
CREATE POLICY "Users can view members in their organizations" ON members
  FOR SELECT USING (user_id = auth.uid() OR org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert themselves as members" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Social accounts policies
CREATE POLICY "Users can view accounts in their organizations" ON social_accounts
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create accounts in their organizations" ON social_accounts
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update accounts in their organizations" ON social_accounts
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete accounts in their organizations" ON social_accounts
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

-- Posts policies
CREATE POLICY "Users can view posts in their organizations" ON posts
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create posts in their organizations" ON posts
  FOR INSERT WITH CHECK (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update posts in their organizations" ON posts
  FOR UPDATE USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete posts in their organizations" ON posts
  FOR DELETE USING (org_id IN (
    SELECT org_id FROM members WHERE user_id = auth.uid()
  ));

-- Post insights policies
CREATE POLICY "Users can view insights for posts in their organizations" ON post_insights
  FOR SELECT USING (post_id IN (
    SELECT id FROM posts WHERE org_id IN (
      SELECT org_id FROM members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "System can insert insights" ON post_insights
  FOR INSERT WITH CHECK (true);

-- API keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own API keys" ON api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_social_accounts_updated_at ON social_accounts;
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
