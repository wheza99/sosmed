'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  username: string
  profile_image_url?: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/x/me')
      const data = await response.json()
      if (data.authenticated) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    window.location.href = '/api/auth/x'
  }

  const handleLogout = async () => {
    await fetch('/api/auth/x/logout', { method: 'POST' })
    setUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPosting(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      const data = await response.json()
      setResult(data)
      if (data.success) {
        setContent('')
      }
    } catch (error) {
      setResult({ success: false, error: String(error) })
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🐦 X API Test</h1>
            <p className="text-gray-400">Test posting to X (Twitter) API v2</p>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              {user.profile_image_url && (
                <img src={user.profile_image_url} alt={user.name} className="w-8 h-8 rounded-full" />
              )}
              <span className="text-sm">@{user.username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-black border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Login with X
            </button>
          )}
        </div>

        {user ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tweet Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="What's happening?"
                maxLength={280}
                required
              />
              <p className="text-right text-sm text-gray-500 mt-1">{content.length}/280</p>
            </div>

            <button
              type="submit"
              disabled={posting || !content.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {posting ? 'Posting...' : 'Post to X'}
            </button>
          </form>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">Login with X to test posting tweets</p>
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-black border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Login with X
            </button>
          </div>
        )}

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'}`}>
            <h3 className="font-medium mb-2">{result.success ? '✅ Success' : '❌ Error'}</h3>
            <pre className="text-sm overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result.data || result.error, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
