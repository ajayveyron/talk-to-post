import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'

export async function POST(request: NextRequest) {
  try {
    const { code, state, codeVerifier } = await request.json()
    
    console.log('Testing Twitter OAuth with:', { 
      code: code?.substring(0, 20) + '...', 
      state, 
      codeVerifier: codeVerifier?.substring(0, 20) + '...' 
    })

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    console.log('Twitter client created with Client ID:', process.env.TWITTER_CLIENT_ID)

    // Exchange code for access token
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.TWITTER_REDIRECT_URI!,
    })

    console.log('OAuth exchange successful, getting user info...')

    // Get user info
    const { data: userObject } = await loggedClient.v2.me()

    console.log('User info retrieved:', { id: userObject.id, username: userObject.username })

    return NextResponse.json({
      success: true,
      user: userObject,
      tokens: {
        accessToken: accessToken ? 'Received ✅' : 'Missing ❌',
        refreshToken: refreshToken ? 'Received ✅' : 'Missing ❌',
        expiresIn
      }
    })

  } catch (error: any) {
    console.error('Twitter OAuth debug error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      errorCode: error.code,
      errorData: error.data,
      stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
      config: {
        clientId: process.env.TWITTER_CLIENT_ID ? 'Set ✅' : 'Missing ❌',
        clientSecret: process.env.TWITTER_CLIENT_SECRET ? 'Set ✅' : 'Missing ❌',
        redirectUri: process.env.TWITTER_REDIRECT_URI,
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Twitter OAuth Debug Endpoint',
    usage: 'POST with { code, state, codeVerifier } to test OAuth exchange',
    config: {
      clientId: process.env.TWITTER_CLIENT_ID || 'Missing',
      redirectUri: process.env.TWITTER_REDIRECT_URI || 'Missing',
      environment: process.env.NODE_ENV || 'development'
    }
  })
}
