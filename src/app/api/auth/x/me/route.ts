import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('x_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    const response = await fetch('https://api.x.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ authenticated: false })
    }

    const data = await response.json()
    return NextResponse.json({ 
      authenticated: true, 
      user: data.data 
    })
  } catch (error) {
    return NextResponse.json({ authenticated: false })
  }
}
