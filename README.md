# TweetFlow

Twitter auto-post scheduler for Citra (Marketing).

## Features

- Schedule tweets for auto-posting
- Queue management
- Twitter API v2 integration
- Auth via Supabase

## Setup

1. Install:
```bash
npm install
```

2. Setup Supabase:
   - Create project at supabase.com
   - Run `supabase/schema.sql` in SQL Editor
   - Copy credentials

3. Setup Twitter API:
   - Create app at developer.twitter.com
   - Get API Key, API Secret, Access Token, Access Secret

4. Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
TWITTER_API_KEY=your-key
TWITTER_API_SECRET=your-secret
TWITTER_ACCESS_TOKEN=your-token
TWITTER_ACCESS_SECRET=your-secret
```

5. Run:
```bash
npm run dev
```

## Stack

- Next.js 15 + TypeScript
- Supabase (Auth + Database)
- Twitter API v2
- Tailwind CSS
