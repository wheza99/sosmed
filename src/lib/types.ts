export interface Tweet {
  id: string
  content: string
  scheduled_at: string
  status: 'pending' | 'posted' | 'failed'
  tweet_id?: string
  error?: string
  created_at: string
  posted_at?: string
}
