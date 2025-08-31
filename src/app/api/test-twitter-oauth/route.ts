import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'

export async function GET(request: NextRequest) {
  try {
    console.log('=== TWITTER OAUTH DIAGNOSTIC TEST ===')

    // Check environment variables
    const envCheck = {
      client_id: process.env.TWITTER_CLIENT_ID ? '✅ Set' : '❌ Missing',
      client_secret: process.env.TWITTER_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
      redirect_uri: process.env.TWITTER_REDIRECT_URI ? '✅ Set' : '❌ Missing',
    }

    console.log('Environment check:', envCheck)

    // If environment variables are missing, return error
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Missing Twitter API credentials',
        environment: envCheck,
        solution: 'Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your .env.local file'
      }, { status: 400 })
    }

    try {
      // Try to initialize Twitter client
      console.log('Testing Twitter client initialization...')
      const twitterClient = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      })

      // Generate OAuth2 authorization link
      const redirectUri = process.env.TWITTER_REDIRECT_URI || 'http://localhost:3000/api/auth/twitter/direct-oauth'
      console.log('Using redirect URI:', redirectUri)

      const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        redirectUri,
        {
          scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        }
      )

      console.log('OAuth URL generated successfully')

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Twitter OAuth configuration is working correctly!',
        environment: envCheck,
        oauth_url: url.substring(0, 100) + '...',
        redirect_uri: redirectUri,
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        next_steps: [
          '✅ Environment variables are set',
          '✅ Twitter client initialized successfully',
          '✅ OAuth URL generated correctly',
          '🚀 Ready to test authentication!'
        ]
      })

    } catch (twitterError: any) {
      console.error('Twitter client error:', twitterError)

      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Twitter client initialization failed',
        twitter_error: twitterError.message,
        environment: envCheck,
        possible_causes: [
          'Invalid Client ID or Client Secret',
          'Twitter app not properly configured',
          'OAuth 2.0 not enabled in Twitter Developer Portal',
          'Wrong permissions/scopes requested'
        ]
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Diagnostic test error:', error)

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Unexpected error during diagnostic test',
      details: error.message
    }, { status: 500 })
  }
}
