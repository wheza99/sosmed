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

/**
 * Refresh X OAuth2 access token using refresh_token
 * Auto-updates DB with new tokens
 */
async function refreshXToken(account) {
  if (!account.refresh_token) {
    throw new Error('No refresh token available. Please reconnect your account.');
  }

  console.log('[Token Refresh] Refreshing token for account ' + account.id + '...');

  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(process.env.X_CLIENT_ID + ':' + process.env.X_CLIENT_SECRET).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Token Refresh] Failed:', data);
    throw new Error('Failed to refresh token. Please reconnect your account.');
  }

  // Calculate new expiration
  const newExpiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000);

  // Update DB with new tokens
  const { error: updateError } = await adminClient
    .from('social_accounts')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  if (updateError) {
    console.error('[Token Refresh] DB update failed:', updateError);
    throw new Error('Failed to save refreshed token');
  }

  console.log('[Token Refresh] Success! Token valid until ' + newExpiresAt.toISOString());

  return data.access_token;
}

/**
 * Get valid access token, refreshing if needed
 */
async function getValidToken(account) {
  // Check if token is expired or will expire in next 5 minutes
  const now = new Date();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  if (!expiresAt || (expiresAt.getTime() - now.getTime()) < bufferMs) {
    console.log('[Token Check] Token expired or expiring soon, refreshing...');
    return await refreshXToken(account);
  }

  console.log('[Token Check] Token still valid until ' + expiresAt.toISOString());
  return account.access_token;
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
  {
    name: 'search_recent_posts',
    description: 'Search recent posts on X (Twitter) for research, competitor analysis, and trend discovery. Returns posts from the last 7 days. All searches are saved to history for transparency. Uses connected X account token for authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query with operators. Examples: "MCP OR AI agents", "from:username", "#hashtag", "keyword -is:retweet has:links"'
        },
        account_id: {
          type: 'string',
          description: 'Account UUID to use for search. If not provided, will use the first available X account in workspace.'
        },
        start_time: {
          type: 'string',
          description: 'ISO 8601 timestamp for oldest post (e.g., "2026-03-01T00:00:00Z")'
        },
        end_time: {
          type: 'string',
          description: 'ISO 8601 timestamp for newest post (e.g., "2026-03-03T00:00:00Z")'
        },
        max_results: {
          type: 'number',
          description: 'Number of results (10-100, default: 10)'
        },
        sort_order: {
          type: 'string',
          enum: ['recency', 'relevancy'],
          description: 'Sort by recency or relevancy (default: recency)'
        },
        next_token: {
          type: 'string',
          description: 'Pagination token from previous response'
        },
        tweet_fields: {
          type: 'string',
          description: 'Comma-separated fields to include (default: created_at,public_metrics,author_id)'
        },
        expansions: {
          type: 'string',
          description: 'Expansions to include (e.g., "author_id" to get user info)'
        },
        user_fields: {
          type: 'string',
          description: 'User fields to include with expansions (e.g., "username,name,verified,public_metrics")'
        }
      },
      required: ['query'],
    },
  },
];

function formatPost(post) {
  const statusEmoji = { posted: '✅', draft: '📝', failed: '❌' };
  const account = Array.isArray(post.account) ? post.account[0] : post.account;
  return {
    id: post.id,
    content: post.content?.substring(0, 100) + (post.content?.length > 100 ? '...' : ''),
    status: (statusEmoji[post.status] || '❓') + ' ' + post.status,
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
          const { data: post, error } = await adminClient.from('posts').select('id, content, status, posted_at, created_at, platform_post_id, error_message, account:social_accounts(id, platform, username, display_name, access_token, refresh_token, token_expires_at)').eq('id', post_id).eq('org_id', orgId).single();
          if (error) throw error;

          let platformData = null;
          const account = Array.isArray(post.account) ? post.account[0] : post.account;
          if (post.platform_post_id && account?.platform === 'x') {
            try {
              // Get valid token (refresh if needed)
              const accessToken = await getValidToken(account);
              
              const response = await fetch('https://api.x.com/2/tweets?ids=' + post.platform_post_id + '&tweet.fields=created_at,public_metrics,text', { headers: { 'Authorization': 'Bearer ' + accessToken } });
              if (response.ok) {
                const data = await response.json();
                platformData = data.data?.[0] || null;
                
                // Save metrics to post_metrics table (async)
                if (platformData?.public_metrics) {
                  const metrics = platformData.public_metrics;
                  adminClient
                    .from('post_metrics')
                    .insert({
                      post_id: post.id,
                      retweet_count: metrics.retweet_count || 0,
                      reply_count: metrics.reply_count || 0,
                      like_count: metrics.like_count || 0,
                      quote_count: metrics.quote_count || 0,
                      bookmark_count: metrics.bookmark_count || 0,
                      impression_count: metrics.impression_count || 0
                    })
                    .then(() => console.log('[get_post] Metrics saved'))
                    .catch(err => console.error('[get_post] Failed to save metrics:', err));
                }
              }
            } catch (e) { console.error('X API error:', e); }
          }
          return { content: [{ type: 'text', text: JSON.stringify({ post: formatPost(post), platform_data: platformData ? { id: platformData.id, text: platformData.text, metrics: platformData.public_metrics } : null }, null, 2) }] };
        }

        case 'create_post': {
          const { account_id, content } = args;
          if (!content || content.trim().length === 0) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Content is required' }) }] };

          const { data: account, error: accountError } = await adminClient.from('social_accounts').select('id, platform, access_token, refresh_token, token_expires_at').eq('id', account_id).eq('org_id', orgId).single();
          if (accountError || !account) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Account not found' }) }] };

          let status = 'draft';
          let platformPostId = null;
          let postedAt = null;
          let errorMessage = null;

          if (account.platform === 'x') {
            if (content.length > 280) return { content: [{ type: 'text', text: JSON.stringify({ error: 'Content exceeds 280 characters for X' }) }] };

            try {
              // Get valid token (refresh if needed)
              const accessToken = await getValidToken(account);
              
              const response = await fetch('https://api.x.com/2/tweets', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
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
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Platform ' + account.platform + ' not supported' }) }] };
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

        case 'search_recent_posts': {
          const {
            query,
            account_id,
            start_time,
            end_time,
            max_results = 10,
            sort_order = 'recency',
            next_token,
            tweet_fields = 'created_at,public_metrics,author_id',
            expansions,
            user_fields
          } = args;

          if (!query) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'Query is required' }) }] };
          }

          // Get X account - either specified or first available
          let account;
          if (account_id) {
            const { data, error } = await adminClient
              .from('social_accounts')
              .select('id, platform, access_token, refresh_token, token_expires_at, username')
              .eq('id', account_id)
              .eq('org_id', orgId)
              .eq('platform', 'x')
              .eq('is_active', true)
              .single();
            
            if (error || !data) {
              return { 
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify({ error: 'X account not found or inactive' }) 
                }] 
              };
            }
            account = data;
          } else {
            // Get first available X account
            const { data, error } = await adminClient
              .from('social_accounts')
              .select('id, platform, access_token, refresh_token, token_expires_at, username')
              .eq('org_id', orgId)
              .eq('platform', 'x')
              .eq('is_active', true)
              .limit(1)
              .single();
            
            if (error || !data) {
              return { 
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify({ 
                    error: 'No connected X account found. Please connect an X account first.' 
                  }) 
                }] 
              };
            }
            account = data;
          }

          // Get valid access token (refresh if needed)
          let accessToken;
          try {
            accessToken = await getValidToken(account);
          } catch (tokenError) {
            console.error('[Search] Token error:', tokenError);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to get valid access token',
                  message: tokenError.message,
                  hint: 'Please reconnect your X account'
                })
              }]
            };
          }

          // Build API URL with parameters
          const params = new URLSearchParams();
          params.append('query', query);
          params.append('max_results', Math.min(Math.max(max_results, 10), 100).toString());
          params.append('tweet.fields', tweet_fields);
          
          if (start_time) params.append('start_time', start_time);
          if (end_time) params.append('end_time', end_time);
          if (sort_order) params.append('sort_order', sort_order);
          if (next_token) params.append('next_token', next_token);
          if (expansions) params.append('expansions', expansions);
          if (user_fields) params.append('user.fields', user_fields);

          const url = `https://api.x.com/2/tweets/search/recent?${params.toString()}`;

          console.log('[Search] Query:', query);
          console.log('[Search] Account:', account.username);
          console.log('[Search] URL:', url);

          try {
            const response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });

            const data = await response.json();

            if (!response.ok) {
              console.error('[Search] X API error:', response.status, data);
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    error: 'X API error',
                    status: response.status,
                    details: data.errors || data,
                    hint: data.title === 'Unauthorized' 
                      ? 'Token may be expired or invalid. Try reconnecting your X account.'
                      : undefined
                  }, null, 2)
                }]
              };
            }

            // Format successful response
            const result = {
              success: true,
              query: query,
              account_used: account.username,
              total_results: data.meta?.result_count || 0,
              posts: data.data || [],
              users: data.includes?.users || [],
              meta: {
                newest_id: data.meta?.newest_id,
                oldest_id: data.meta?.oldest_id,
                result_count: data.meta?.result_count || 0,
                next_token: data.meta?.next_token
              }
            };

            // Save to search_history for audit trail (async, don't wait)
            adminClient
              .from('search_history')
              .insert({
                org_id: orgId,
                user_id: userId,
                account_id: account.id,
                query: query,
                max_results: max_results,
                sort_order: sort_order,
                start_time: start_time,
                end_time: end_time,
                total_results: result.total_results,
                posts: result.posts,
                users: result.users,
                meta: result.meta,
                account_used: account.username
              })
              .then(() => console.log('[Search] Saved to history'))
              .catch(err => console.error('[Search] Failed to save history:', err));

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          } catch (fetchError) {
            console.error('[Search] Fetch error:', fetchError);
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'Failed to connect to X API',
                  message: fetchError.message
                }, null, 2)
              }]
            };
          }
        }

        default:
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool: ' + name }) }] };
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
  console.log('Sosmed MCP Server running on port ' + PORT);
  console.log('SSE endpoint: http://localhost:' + PORT + '/sse');
});
