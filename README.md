# Sosmed Online

Social media management platform.

## Features

- Twitter/X OAuth 2.0 integration
- Post creation with immediate posting or scheduling
- Post metrics and insights from X API
- Queue management (draft/scheduled/posted/failed)
- Multi-platform support (coming soon)
- MCP Server for AI assistant integration

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

# For MCP Server (optional)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SOSMED_ORG_ID=your-org-id
```

5. Run:
```bash
npm run dev
```

## MCP Server

AI assistant integration via Model Context Protocol.

See [MCP_README.md](./MCP_README.md) for setup and usage.

### Quick Test
```bash
mcporter list
mcporter call sosmed get_workspace
```

## API Endpoints

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post (and optionally post to X)
- `GET /api/posts/[id]` - Get post with platform metrics
- `PATCH /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post

### Accounts
- `GET /api/accounts` - List accounts
- `GET /api/accounts/[id]` - Get account details
- `PATCH /api/accounts/[id]` - Update account

## Stack

- Next.js 16 + TypeScript
- Supabase (Database)
- Twitter/X OAuth 2.0 (PKCE)
- Tailwind CSS
- MCP (Model Context Protocol)
