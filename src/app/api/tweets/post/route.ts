import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { tweetId, content } = await request.json()
    
    // Post tweet using X API v2
    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.X_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content
      })
    })

    const tweet = await response.json()

    if (!response.ok) {
      throw new Error(tweet.errors?.[0]?.detail || 'Failed to post tweet')
    }

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
