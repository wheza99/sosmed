import { NextRequest, NextResponse } from 'next/server'
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Always use APP_URL for redirects (tunneling friendly)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, appUrl))
  }

  const storedState = request.cookies.get('x_oauth_state')?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL('/?error=invalid_state', appUrl))
  }

  const codeVerifier = request.cookies.get('x_code_verifier')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=missing_verifier', appUrl))
  }

  const redirectUri = `${appUrl}/api/auth/x/callback`

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
    return NextResponse.redirect(new URL(`/?error=token_exchange_failed`, appUrl))
  }

  // Get user info from X API
  const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
    },
  })

  const userData = await userResponse.json()
  
  if (!userResponse.ok) {
    console.error('Failed to fetch user info:', userData)
    return NextResponse.redirect(new URL('/?error=user_fetch_failed', appUrl))
  }

  console.log('X User Data:', userData)

  // Get current app user
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.redirect(new URL('/?error=not_authenticated', appUrl))
  }

  // Get active organization from query or user's first org
  const adminClient = createAdminClient()
  const { data: memberData } = await adminClient
    .from('members')
    .select('org_id')
    .eq('user_id', authUser.id)
    .limit(1)
    .single()

  if (!memberData) {
    return NextResponse.redirect(new URL('/?error=no_organization', appUrl))
  }

  // Calculate token expiration
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000)

  // Store or update social account
  const { error: upsertError } = await adminClient
    .from('social_accounts')
    .upsert({
      org_id: memberData.org_id,
      user_id: authUser.id,
      platform: 'x',
      username: userData.data.username,
      display_name: userData.data.name,
      platform_user_id: userData.data.id,
      avatar_url: userData.data.profile_image_url,
      follower_count: userData.data.public_metrics?.followers_count || 0,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'org_id,platform,username',
    })

  if (upsertError) {
    console.error('Failed to save social account:', upsertError)
    return NextResponse.redirect(new URL('/?error=save_failed', appUrl))
  }

  // Clean up OAuth cookies
  const response = NextResponse.redirect(new URL('/?connected=x', appUrl))
  response.cookies.delete('x_code_verifier')
  response.cookies.delete('x_oauth_state')

  return response
}
