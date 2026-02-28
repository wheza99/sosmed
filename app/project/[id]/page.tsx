'use client'

import { use, useState, useEffect } from 'react'
import { useUser } from '@/context/user-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Send, Loader2, CheckCircle2, XCircle, AlertCircle, ArrowLeft, RefreshCw, Heart, MessageCircle, Repeat2, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface SocialAccount {
  id: string
  org_id: string
  platform: string
  username: string
  display_name: string
  avatar_url: string
}

interface Post {
  id: string
  content: string
  status: string
  posted_at: string | null
  platform_post_id: string | null
  error_message: string | null
  created_at: string
  insights?: { likes: number; comments: number; shares: number; views: number } | null
}

interface PlatformData {
  id: string
  text: string
  public_metrics?: { like_count: number; reply_count: number; retweet_count: number; impression_count: number; bookmark_count: number }
  created_at?: string
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, activeOrg } = useUser()
  
  const [account, setAccount] = useState<SocialAccount | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [refreshingPost, setRefreshingPost] = useState<string | null>(null)
  const [expandedPosts, setExpandedPosts] = useState<Record<string, PlatformData>>({})

  useEffect(() => {
    if (!id) return
    fetch(`/api/accounts/${id}`).then(r => r.json()).then(data => {
      if (data.status === 'success') setAccount(data.data)
      else toast.error(data.message || 'Failed to load account')
    }).catch(() => toast.error('Failed to load account'))
  }, [id])

  useEffect(() => {
    if (!id || !activeOrg?.id) return
    fetch(`/api/posts?orgId=${activeOrg.id}&accountId=${id}`).then(r => r.json()).then(data => {
      if (data.status === 'success') setPosts(data.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id, activeOrg?.id])

  const handlePost = async () => {
    if (!content.trim()) { toast.error('Please enter content'); return }
    if (!account || !activeOrg) { toast.error('Account not loaded'); return }
    if (account.platform === 'x' && content.length > 280) { toast.error('Max 280 characters for X'); return }

    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id, org_id: activeOrg.id, content: content.trim() }),
      })
      const data = await res.json()
      if (data.status === 'success') {
        toast.success(data.posted ? 'Posted!' : 'Failed to post')
        setContent('')
        setPosts(prev => [data.data, ...prev])
      } else {
        toast.error(data.message || 'Failed to post')
      }
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  const handleRefreshPost = async (postId: string) => {
    setRefreshingPost(postId)
    try {
      const res = await fetch(`/api/posts/${postId}`)
      const data = await res.json()
      if (data.status === 'success' && data.platformData) {
        setExpandedPosts(prev => ({ ...prev, [postId]: data.platformData }))
        setPosts(prev => prev.map(p => p.id === postId && data.platformData?.public_metrics ? {
          ...p,
          insights: {
            likes: data.platformData.public_metrics.like_count || 0,
            comments: data.platformData.public_metrics.reply_count || 0,
            shares: data.platformData.public_metrics.retweet_count || 0,
            views: data.platformData.public_metrics.impression_count || 0,
          }
        } : p))
        toast.success('Refreshed')
      } else { toast.error(data.message || 'Failed') }
    } catch { toast.error('Failed') }
    finally { setRefreshingPost(null) }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted': return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Posted</Badge>
      case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default: return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Draft</Badge>
    }
  }

  const getPlatformIcon = (platform: string) => {
    if (platform === 'x') return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    return null
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (!user) return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-muted-foreground">Please log in</p></div>
  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  if (!account) return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-muted-foreground">Account not found</p></div>

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/"><ArrowLeft className="w-5 h-5" /></Link></Button>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={account.avatar_url} />
            <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{account.display_name || account.username}</h1>
              {getPlatformIcon(account.platform)}
            </div>
            <p className="text-sm text-muted-foreground">@{account.username}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Post</CardTitle>
          <CardDescription>Write and publish to {account.platform.toUpperCase()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea placeholder="What's happening?" value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="resize-none pr-16" />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              <span className={content.length > 280 ? 'text-red-500' : ''}>{content.length}/280</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={handlePost} disabled={posting || !content.trim()}>
              {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Post Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Posts</CardTitle></CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No posts yet</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getStatusBadge(post.status)}
                        <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
                        {post.status === 'posted' && (
                          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => handleRefreshPost(post.id)} disabled={refreshingPost === post.id}>
                            {refreshingPost === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                      {post.error_message && <p className="text-xs text-red-500 mt-1">{post.error_message}</p>}
                      {(post.insights || expandedPosts[post.id]?.public_metrics) && (
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(post.insights?.likes || expandedPosts[post.id]?.public_metrics?.like_count || 0)}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(post.insights?.comments || expandedPosts[post.id]?.public_metrics?.reply_count || 0)}</span>
                          <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{formatNumber(post.insights?.shares || expandedPosts[post.id]?.public_metrics?.retweet_count || 0)}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(post.insights?.views || expandedPosts[post.id]?.public_metrics?.impression_count || 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
