import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { getTwitterRedirectUri } from '@/lib/urls'

export async function GET(request: NextRequest) {
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    const redirectUri = getTwitterRedirectUri()
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      redirectUri,
      {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      }
    )

    // Store code verifier and state in session/cookies for verification
    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.redirect(url)
    
    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: isProduction, // Secure in production (HTTPS), false for local development
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })
    response.cookies.set('twitter_state', state, {
      httpOnly: true,
      secure: isProduction, // Secure in production (HTTPS), false for local development
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    console.log('OAuth cookies set:', { codeVerifier: codeVerifier.substring(0, 10) + '...', state })

    return response
  } catch (error) {
    console.error('Twitter OAuth login error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Twitter OAuth' },
      { status: 500 }
    )
  }
}
