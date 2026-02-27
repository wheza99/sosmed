# Sosmed Online

Social media management platform.

## Features

- Twitter/X OAuth 2.0 integration
- Schedule posts for auto-posting
- Queue management (pending/posted/failed)
- Multi-platform support (coming soon)

## Setup

1. Install:
```bash
npm install
```

2. Setup Supabase:
   - Create project at supabase.com
   - Run `supabase/schema.sql` in SQL Editor
   - Copy credentials

3. Setup Twitter/X OAuth:
   - Create app at developer.twitter.com
   - Enable OAuth 2.0
   - Add callback URL: `https://your-domain.com/api/auth/x/callback`
   - Get Client ID and Client Secret

4. Create `.env.local`:
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
X_CLIENT_ID=your-client-id
X_CLIENT_SECRET=your-client-secret
```

5. Run:
```bash
npm run dev
```

## Stack

- Next.js 16 + TypeScript
- Supabase (Database)
- Twitter/X OAuth 2.0 (PKCE)
- Tailwind CSS
