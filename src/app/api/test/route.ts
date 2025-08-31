import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        has_openai_key: !!process.env.OPENAI_API_KEY,
        has_openrouter_key: !!process.env.OPENROUTER_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_twitter_client_id: !!process.env.TWITTER_CLIENT_ID,
      }
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { error: 'Test API failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      message: 'POST request received',
      received_data: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Test API POST error:', error)
    return NextResponse.json(
      { error: 'Test POST failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
