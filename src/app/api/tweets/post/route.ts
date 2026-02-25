import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { tweetId, content } = await request.json()
    
    const twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    })

    const tweet = await twitterClient.v2.tweet(content)
    
    // Update tweet status
    const supabase = await createClient()
    await supabase
      .from('tweets')
      .update({ 
        status: 'posted', 
        tweet_id: tweet.data.id,
        posted_at: new Date().toISOString()
      })
      .eq('id', tweetId)

    return NextResponse.json({ success: true, tweetId: tweet.data.id })
  } catch (error) {
    const body = await request.json().catch(() => ({}))
    
    // Update tweet status to failed
    const supabase = await createClient()
    if (body.tweetId) {
      await supabase
        .from('tweets')
        .update({ status: 'failed', error: String(error) })
        .eq('id', body.tweetId)
    }

    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
