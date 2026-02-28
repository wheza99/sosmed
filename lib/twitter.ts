import { Tweet } from '@/lib/types'

export async function postTweet(tweet: Tweet): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    const response = await fetch('/api/tweets/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweetId: tweet.id, content: tweet.content }),
    })
    const data = await response.json()
    return data
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
