import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  const storedState = request.cookies.get('x_oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=invalid_state', request.url))
  }

  const codeVerifier = request.cookies.get('x_code_verifier')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=missing_verifier', request.url))
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/x/callback`

  // Exchange code for token
  const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      code: code!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok) {
    console.error('Token exchange failed:', tokenData)
    return NextResponse.redirect(new URL(`/?error=token_exchange_failed`, request.url))
  }

  const response = NextResponse.redirect(new URL('/', request.url))
  
  response.cookies.set('x_access_token', tokenData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: tokenData.expires_in || 7200,
  })

  if (tokenData.refresh_token) {
    response.cookies.set('x_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  response.cookies.delete('x_code_verifier')
  response.cookies.delete('x_oauth_state')

  return response
}
