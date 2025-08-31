import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug OAuth URL generation')
    
    // Generate the same redirect URI logic as the OAuth endpoint
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/auth/twitter/direct-oauth`
    
    // Get all relevant headers
    const headers = {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      'user-agent': request.headers.get('user-agent')?.substring(0, 100),
    }
    
    return NextResponse.json({
      success: true,
      debug_info: {
        current_url: request.url,
        generated_redirect_uri: redirectUri,
        protocol_used: protocol,
        host_detected: host,
        request_headers: headers,
        env_vars: {
          twitter_redirect_uri: process.env.TWITTER_REDIRECT_URI || 'NOT_SET',
          twitter_client_id: process.env.TWITTER_CLIENT_ID ? 'SET' : 'NOT_SET',
          node_env: process.env.NODE_ENV
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Debug OAuth URL error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
