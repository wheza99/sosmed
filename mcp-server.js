#!/usr/bin/env node

/**
 * Remote MCP Server for Sosmed Online
 * Implements Model Context Protocol (JSON-RPC 2.0) over HTTP/SSE
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import express from 'express';

const app = express();
const PORT = process.env.MCP_PORT || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-api-key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function validateApiKey(apiKey) {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const { data: keyData, error } = await adminClient
    .from('api_keys')
    .select('user_id, org_id, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !keyData) throw new Error('Invalid API key');
  if (!keyData.is_active) throw new Error('API key is inactive');
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) throw new Error('API key has expired');
  if (!keyData.org_id) throw new Error('API key is not associated with any workspace');
  
  adminClient.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash).then();
  
  return { userId: keyData.user_id, orgId: keyData.org_id };
}

const TOOLS = [
  {
    name: 'get_workspace',
    description: 'Get workspace info and stats',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_accounts',
    description: 'List all social media accounts',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Filter by platform (x, instagram, tiktok)' },
      },
    },
  },
  {
    name: 'get_account',
    description: 'Get details of a specific account',
    inputSchema: {
      type: 'object',
      properties: { account_id: { type: 'string', description: 'Account UUID' } },
      required: ['account_id'],
    },
  },
  {
    name: 'list_posts',
    description: 'List posts with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Filter by account ID' },
        status: { type: 'string', enum: ['draft', 'posted', 'failed'], description: 'Filter by status' },
        limit: { type: 'number', description: 'Max posts (default: 20)' },
      },
    },
  },
  {
    name: 'get_post',
    description: 'Get post details with metrics from platform',
    inputSchema: {
      type: 'object',
      properties: { post_id: { type: 'string', description: 'Post UUID' } },
      required: ['post_id'],
    },
  },
  {
    name: 'create_post',
    description: 'Create a new post and publish to platform immediately',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Account UUID to post from' },
        content: { type: 'string', description: 'Post content (max 280 chars for X)' },
      },
      required: ['account_id', 'content'],
    },
  },
  {
    name: 'delete_post',
    description: 'Delete a post',
    inputSchema: {
      type: 'object',
      properties: { post_id: { type: 'string', description: 'Post UUID' } },
      required: ['post_id'],
    },
  },
];

function formatPost(post) {
  const statusEmoji = { posted: '✅', draft: '📝', failed: '❌' };
  const account = Array.isArray(post.account) ? post.account[0] : post.account;
  return {
    id: post.id,
    content: post.content?.substring(0, 100) + (post.content?.length > 100 ? '...' : ''),
    status: `${statusEmoji[post.status] || '❓'} ${post.status}`,
    platform: account?.platform || 'unknown',
    username: account?.username || 'unknown',
    created_at: post.created_at,
    posted_at: post.posted_at,
  };
}

function createMCPServer(authContext) {
  const { userId, orgId } = authContext;
  
  const server = new Server(
    { name: 'sosmed-online', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_workspace': {
          const { data: org, error } = await adminClient.from('organizations').select('*').eq('id', orgId).single();
          if (error) throw error;
          const { count: accountCount } = await adminClient.from('social_accounts').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
          const { data: postStats } = await adminClient.from('posts').select('status').eq('org_id', orgId);
          const postCounts = postStats?.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});
          return { content: [{ type: 'text', text: JSON.stringify({ workspace: org, stats: { accounts: accountCount || 0, posts: { total: postStats?.length || 0, ...postCounts } } }, null, 2) }] };
        }

        case 'list_accounts': {
          const { platform } = args;
          let query = adminClient.from('social_accounts').select('id, platform, username, display_name, avatar_url, follower_count, is_active').eq('org_id', orgId).eq('is_active', true);
          if (platform) query = query.eq('platform', platform);
          const { data: accounts, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;
          return { content: [{ type: 'text', text: JSON.stringify({ count: accounts.length, accounts: accounts.map(a => ({ id: a.id, platform: a.platform, username: a.username, display_name: a.display_name, followers: a.follower_count })) }, null, 2) }] };
        }

        case 'get_account': {
          const { account_id } = args;
          const { data: account, error } = await adminClient.from('social_accounts').select('id, org_id, platform, username, display_name, avatar_url, follower_count, brand_name, tone, writing_style, language, target_audience, is_active').eq('id', account_id).eq('org_id', orgId).single();
          if (error) throw error;
          return { content: [{ type: 'text', text: JSON.stringify(account, null, 2) }] };
        }

        case 'list_posts': {
          const { account_id, status, limit = 20 } = args;
          let query = adminClient.from('posts').select('id, content, status, posted_at, created_at, platform_post_id, account:social_accounts(id, platform, username, display_name)').eq('org_id', orgId);
          if (account_id) query = query.eq('account_id', account_id);
          if (status) query = query.eq('status', status);
          const { data: posts, error } = await query.order('created_at', { ascending: false }).limit(limit);
          if (error) throw error;
          return { content: [{ type: 'text', text: JSON.stringify({ count: posts.length, posts: posts.map(formatPost) }, null, 2) }] };
        }

        case 'get_post': {
          const { post_id } = args;
          const { data: post, error } = await adminClient.from('posts').select('id, content, status, posted_at, created_at, platform_post_id, error_message, account:social_accounts(id, platform, username, display_name, access_token)').eq('id', post_id).eq('org_id', orgId).single();
          if (error) throw error;

          let platformData = null;
          const account = Array.isArray(post.account) ? post.account[0] : post.account;
          if (post.platform_post_id && account?.platform === 'x' && account?.access_token) {
            try {
              const response = await fetch(`https://api.x.com/2/tweets?ids=${post.platform_post_id}&tweet.fields=created_at,public_metrics,text`, { headers: { 'Authorization': `Bearer ${account.access_token}` } });
              if (response.ok) {
                const data = await response.json();
                platformData = data.data?.[0] || null;
              }
            } catch (e) { console.error('X API error:', e); }
          }
          return { content: [{ type: 'text', text: JSON.stringify({ post: formatPost(post), platform_data: platformData ? { id: platformData.id, text: platformData.text, metrics: platformData.public_metrics } : null }, null, 2) }] };
        }

        case 'create_post': {
          const { account_id, content } = args;
          if (!content || content.trim().length === 0) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Content is required' }) }] };

          const { data: account, error: accountError } = await adminClient.from('social_accounts').select('id, platform, access_token').eq('id', account_id).eq('org_id', orgId).single();
          if (accountError || !account) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Account not found' }) }] };

          let status = 'draft';
          let platformPostId = null;
          let postedAt = null;
          let errorMessage = null;

          if (account.platform === 'x') {
            if (content.length > 280) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Content exceeds 280 characters for X' }) }] };
            if (!account.access_token) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Account not connected. Please reconnect.' }) }] };

            try {
              const response = await fetch('https://api.x.com/2/tweets', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: content }),
              });
              const data = await response.json();
              if (!response.ok) {
                status = 'failed';
                errorMessage = JSON.stringify(data.errors || data);
              } else {
                status = 'posted';
                platformPostId = data.data?.id;
                postedAt = new Date().toISOString();
              }
            } catch (e) {
              status = 'failed';
              errorMessage = String(e);
            }
          } else {
            return { content: [{ type: 'text', text: JSON.stringify({ error: `Platform '${account.platform}' not supported` }) }] };
          }

          const { data: post, error } = await adminClient.from('posts').insert({ account_id, org_id: orgId, user_id: userId, content, status, platform_post_id: platformPostId, posted_at: postedAt, error_message: errorMessage }).select('id, content, status, posted_at, created_at, account:social_accounts(id, platform, username)').single();
          if (error) throw error;

          return { content: [{ type: 'text', text: JSON.stringify({ success: true, post: formatPost(post), message: status === 'posted' ? 'Post published!' : 'Failed to post', error: errorMessage }, null, 2) }] };
        }

        case 'delete_post': {
          const { post_id } = args;
          const { error } = await adminClient.from('posts').delete().eq('id', post_id).eq('org_id', orgId);
          if (error) throw error;
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Post deleted' }, null, 2) }] };
        }

        default:
          return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }] };
      }
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
    }
  });

  return server;
}

const sessions = new Map();

app.get('/sse', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: 'API key required' });
    
    const authContext = await validateApiKey(apiKey);
    const transport = new SSEServerTransport('/message', res);
    const sessionId = transport.sessionId;
    const server = createMCPServer(authContext);
    
    sessions.set(sessionId, { server, transport, authContext });
    await server.connect(transport);
    
    req.on('close', () => {
      sessions.delete(sessionId);
      transport.close();
    });
  } catch (error) {
    if (!res.headersSent) res.status(401).json({ error: error.message });
  }
});

app.post('/message', async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    const session = sessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.get('/test-auth', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: 'API key required' });
    const authContext = await validateApiKey(apiKey);
    res.json({ status: 'ok', orgId: authContext.orgId, userId: authContext.userId });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'sosmed-mcp', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Sosmed MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
