import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postTweet } from '@/lib/twitter'

// This endpoint would be called by a cron job (e.g., every minute)
export async function GET() {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    
    // Get pending tweets that are due
    const { data: tweets } = await supabase
      .from('tweets')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
    
    if (!tweets || tweets.length === 0) {
      return NextResponse.json({ message: 'No tweets to post' })
    }

    // Post each tweet
    const results = []
    for (const tweet of tweets) {
      const result = await postTweet(tweet)
      results.push({ id: tweet.id, result })
    }

    return NextResponse.json({ posted: results.length, results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
