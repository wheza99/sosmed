import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('x_access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated. Please login with X first.',
        needsAuth: true
      }, { status: 401 })
    }

    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Text is required' }, { status: 400 })
    }

    if (text.length > 280) {
      return NextResponse.json({ success: false, error: 'Text must be 280 characters or less' }, { status: 400 })
    }

    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.errors || data,
        status: response.status 
      }, { status: response.status })
    }

    return NextResponse.json({ success: true, data: data.data })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
