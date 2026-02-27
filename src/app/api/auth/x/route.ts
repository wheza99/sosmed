import { NextResponse } from 'next/server'
import crypto from 'crypto'

function base64URLEncode(str: Buffer) {
  return str
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function sha256(plain: string) {
  return crypto.createHash('sha256').update(plain).digest()
}

export async function GET() {
  // Generate PKCE code verifier and challenge
  const codeVerifier = base64URLEncode(crypto.randomBytes(32))
  const codeChallenge = base64URLEncode(sha256(codeVerifier))

  // Generate random state
  const state = base64URLEncode(crypto.randomBytes(16))

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/x/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`

  const response = NextResponse.redirect(authUrl)
  
  response.cookies.set('x_code_verifier', codeVerifier, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600
  })
  response.cookies.set('x_oauth_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600 
  })

  return response
}
