'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, Send, Trash2, Check, X } from 'lucide-react'
import type { Tweet } from '@/lib/types'

export default function DashboardPage() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchTweets()
  }, [])

  const fetchTweets = async () => {
    const { data } = await supabase.from('tweets').select('*').order('scheduled_at', { ascending: true })
    setTweets(data || [])
    setLoading(false)
  }

  const createTweet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !scheduledAt) return

    const { error } = await supabase.from('tweets').insert({
      content: content.trim(),
      scheduled_at: scheduledAt,
    })

    if (!error) {
      setContent('')
      setScheduledAt('')
      fetchTweets()
    }
  }

  const deleteTweet = async (id: string) => {
    if (!confirm('Delete this tweet?')) return
    const { error } = await supabase.from('tweets').delete().eq('id', id)
    if (!error) fetchTweets()
  }

  const charCount = content.length
  const isValid = charCount > 0 && charCount <= 280 && scheduledAt

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  const pending = tweets.filter(t => t.status === 'pending')
  const posted = tweets.filter(t => t.status === 'posted')
  const failed = tweets.filter(t => t.status === 'failed')

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sosmed Online</h1>
            <p className="text-muted-foreground">Schedule tweets for auto-posting</p>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {pending.length} pending</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-green-500" /> {posted.length} posted</span>
            <span className="flex items-center gap-1"><X className="h-4 w-4 text-red-500" /> {failed.length} failed</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compose Tweet</CardTitle>
            <CardDescription>Schedule a new tweet for auto-posting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTweet} className="space-y-4">
              <div>
                <Textarea
                  placeholder="What's happening?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  maxLength={280}
                />
                <div className={`text-sm mt-1 text-right ${charCount > 280 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {charCount}/280
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">Schedule Time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!isValid}>
                  <Send className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Tweets</CardTitle>
          </CardHeader>
          <CardContent>
            {tweets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tweets scheduled yet</p>
            ) : (
              <div className="space-y-3">
                {tweets.map((tweet) => (
                  <div key={tweet.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="text-sm">{tweet.content}</p>
                      {tweet.status === 'pending' && (
                        <Button variant="ghost" size="icon" onClick={() => deleteTweet(tweet.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(tweet.scheduled_at).toLocaleString('id-ID')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        tweet.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        tweet.status === 'posted' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {tweet.status}
                      </span>
                      {tweet.tweet_id && (
                        <a 
                          href={`https://twitter.com/user/status/${tweet.tweet_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          View tweet
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
