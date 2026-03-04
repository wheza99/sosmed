"use client";

import { Copy, Check, Code2, Bot, Key, Server, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(text, id)}>
      {copied === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );

  const CodeBlock = ({ code, id, language = "json" }: { code: string; id: string; language?: string }) => (
    <div className="relative group">
      <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto font-mono"><code>{code}</code></pre>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{language}</Badge>
        <CopyButton text={code} id={id} />
      </div>
    </div>
  );

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          MCP Integration Guide
        </h1>
        <p className="text-muted-foreground mt-2">Connect AI agents to Sosmed via Model Context Protocol</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Quick Start</CardTitle>
          <CardDescription>MCP server endpoint and authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Server URL</label>
            <CodeBlock code="https://mcp.sosmed.online/sse" id="server-url" />
          </div>
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Authentication</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Pass API key in <code className="bg-background px-1 rounded">x-api-key</code> header or <code className="bg-background px-1 rounded">?api_key=</code> query param.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Client Setup</CardTitle>
          <CardDescription>Configuration for AI clients</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mcporter">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mcporter">mcporter</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
              <TabsTrigger value="windsurf">Windsurf</TabsTrigger>
              <TabsTrigger value="cursor">Cursor</TabsTrigger>
            </TabsList>

            <TabsContent value="mcporter" className="space-y-4 mt-4">
              <CodeBlock code={`mcporter config add sosmed --url https://mcp.sosmed.online/sse --transport sse --header "x-api-key=smd_YOUR_KEY"`} id="mcporter-config" language="bash" />
              <p className="text-sm text-muted-foreground">Test:</p>
              <CodeBlock code={`mcporter list\nmcporter call sosmed.get_workspace`} id="mcporter-test" language="bash" />
            </TabsContent>

            <TabsContent value="claude" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">~/Library/Application Support/Claude/claude_desktop_config.json</p>
              <CodeBlock code={`{\n  "mcp_servers": [{\n    "type": "url",\n    "url": "https://mcp.sosmed.online/sse",\n    "name": "sosmed",\n    "authorization_token": "smd_YOUR_KEY"\n  }]\n}`} id="claude-config" />
            </TabsContent>

            <TabsContent value="windsurf" className="space-y-4 mt-4">
              <CodeBlock code={`{\n  "mcpServers": {\n    "sosmed": {\n      "url": "https://mcp.sosmed.online/sse",\n      "headers": { "x-api-key": "smd_YOUR_KEY" }\n    }\n  }\n}`} id="windsurf-config" />
            </TabsContent>

            <TabsContent value="cursor" className="space-y-4 mt-4">
              <CodeBlock code={`{\n  "mcpServers": {\n    "sosmed": {\n      "url": "https://mcp.sosmed.online/sse",\n      "headers": { "x-api-key": "smd_YOUR_KEY" }\n    }\n  }\n}`} id="cursor-config" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5" />Available Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "get_workspace", desc: "Get workspace info and stats", params: "None" },
              { name: "list_accounts", desc: "List social accounts", params: "platform?" },
              { name: "get_account", desc: "Get account details", params: "account_id" },
              { name: "list_posts", desc: "List posts with filters", params: "account_id?, status?, limit?" },
              { name: "get_post", desc: "Get post with metrics", params: "post_id" },
              { name: "create_post", desc: "Create and publish post", params: "account_id, content" },
              { name: "delete_post", desc: "Delete post", params: "post_id" },
              { name: "search_recent_posts", desc: "Search recent posts on X (last 7 days) for research, competitor analysis, and trend discovery. All searches saved to history for transparency. Metrics tracked over time.", params: "query, account_id?, start_time?, end_time?, max_results?, sort_order?, tweet_fields?, expansions?, user_fields?" },
            ].map((tool) => (
              <div key={tool.name} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-sm font-mono">{tool.name}</code>
                  <Badge variant="secondary">Tool</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tool.desc}</p>
                <p className="text-xs text-muted-foreground mt-1">Params: {tool.params}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Example Usage</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Get workspace</label>
            <CodeBlock code={`mcporter call sosmed.get_workspace`} id="ex-ws" language="bash" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">List accounts</label>
            <CodeBlock code={`mcporter call sosmed.list_accounts`} id="ex-acc" language="bash" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Create post</label>
            <CodeBlock code={`mcporter call sosmed.create_post account_id="uuid" content="Hello world!"`} id="ex-create" language="bash" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Get metrics</label>
            <CodeBlock code={`mcporter call sosmed.get_post post_id="uuid"`} id="ex-metrics" language="bash" />
          </div>
          <div className="border-t pt-4 mt-4">
            <label className="text-sm font-medium mb-2 block">Search recent posts - Basic (uses first X account)</label>
            <CodeBlock code={`mcporter call sosmed.search_recent_posts query="MCP OR AI agents" max_results:10`} id="ex-search1" language="bash" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Search with specific account</label>
            <CodeBlock code={`mcporter call sosmed.search_recent_posts query="from:username AI" account_id="your-x-account-uuid" max_results:50`} id="ex-search2" language="bash" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Search with filters</label>
            <CodeBlock code={`mcporter call sosmed.search_recent_posts query="MCP -is:retweet has:links" max_results:50 sort_order:"relevancy" tweet_fields:"created_at,public_metrics,author_id"`} id="ex-search3" language="bash" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">With user expansion (influencer discovery)</label>
            <CodeBlock code={`mcporter call sosmed.search_recent_posts query="MCP AI is:verified" expansions:"author_id" user_fields:"username,name,verified,public_metrics" max_results:20`} id="ex-search4" language="bash" />
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Manage API keys at <Link href="/auth/keys" className="underline hover:text-foreground">/auth/keys</Link>
      </div>
    </div>
  );
}
