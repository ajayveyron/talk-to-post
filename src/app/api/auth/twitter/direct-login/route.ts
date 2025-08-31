import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'

export async function GET(request: NextRequest) {
  return handleTwitterOAuth(request)
}

export async function HEAD(request: NextRequest) {
  return handleTwitterOAuth(request)
}

async function handleTwitterOAuth(request: NextRequest) {
  try {
    console.log('Direct Twitter OAuth login initiated')

    // Initialize Twitter client with your credentials
    const twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    // Generate OAuth2 authorization link - use dynamic redirect URI
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/auth/twitter/direct-oauth`
    console.log('Using redirect URI:', redirectUri)

    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
      redirectUri,
      {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      }
    )

    console.log('Generated OAuth URL:', url.substring(0, 100) + '...')

    // Store code verifier and state in cookies
    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.redirect(url)

    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    response.cookies.set('twitter_state', state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    console.log('OAuth cookies set successfully')
    return response

  } catch (error: any) {
    console.error('Direct Twitter OAuth login error:', error)

    // Provide detailed error information
    const errorDetails = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
      env_check: {
        client_id: !!process.env.TWITTER_CLIENT_ID,
        client_secret: !!process.env.TWITTER_CLIENT_SECRET,
        redirect_uri: !!process.env.TWITTER_REDIRECT_URI,
      }
    }

    console.log('Error details:', errorDetails)

    return NextResponse.json({
      success: false,
      error: error.message,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
