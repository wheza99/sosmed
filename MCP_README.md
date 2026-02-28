# Sosmed MCP Server

MCP server for Sosmed - Social Media Management.

**Protocol:** JSON-RPC 2.0 over HTTP/SSE
**Port:** 4000

## Tools

| Tool | Description |
|------|-------------|
| `get_workspace` | Workspace info + stats |
| `list_accounts` | List social accounts |
| `get_account` | Account details |
| `list_posts` | List posts |
| `get_post` | Post + metrics from X |
| `create_post` | Create and publish |
| `delete_post` | Delete post |

## Setup

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Run

```bash
node mcp-server.js
```

## mcporter

```bash
mcporter config add sosmed --url http://localhost:4000/sse --transport sse --header "x-api-key=smd_YOUR_KEY"
mcporter list
mcporter call sosmed.get_workspace
```

## Examples

```bash
# List accounts
mcporter call sosmed.list_accounts

# Create post
mcporter call sosmed.create_post account_id="uuid" content="Hello!"

# Get metrics
mcporter call sosmed.get_post post_id="uuid"
```

## Endpoints

- `GET /sse` - SSE connection
- `POST /message` - MCP messages
- `GET /health` - Health check
- `GET /test-auth` - Test API key
