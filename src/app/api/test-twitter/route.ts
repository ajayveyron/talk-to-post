import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'

export async function POST(request: NextRequest) {
  try {
    const { tweets } = await request.json()
    const testTweets = tweets || [
      { text: "Testing our new Voice-to-Twitter AI platform! 🚀", char_count: 52 },
      { text: "This technology converts voice recordings into polished tweets automatically. Game-changer for content creators! 🎯", char_count: 115 }
    ]

    console.log('🐦 Testing Twitter API...')

    // Test Twitter API client creation
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    console.log('✅ Twitter API client created successfully')

    // For testing purposes, we'll simulate the OAuth flow
    // In production, users would go through the actual OAuth flow
    return NextResponse.json({
      status: 'success',
      message: 'Twitter API client setup successful',
      test_data: {
        client_configured: true,
        client_id_present: !!process.env.TWITTER_CLIENT_ID,
        client_secret_present: !!process.env.TWITTER_CLIENT_SECRET,
        redirect_uri: process.env.TWITTER_REDIRECT_URI,
        test_tweets: testTweets,
        oauth_flow_needed: true,
        production_note: 'Users need to authenticate via OAuth before posting'
      },
      next_steps: [
        'User clicks "Connect Twitter" button',
        'OAuth flow redirects to Twitter',
        'User authorizes the app',
        'App receives access token',
        'Posts can be made with user token'
      ]
    })

  } catch (error) {
    console.error('Twitter API test error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Twitter API test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      debug_info: {
        client_id_present: !!process.env.TWITTER_CLIENT_ID,
        client_secret_present: !!process.env.TWITTER_CLIENT_SECRET,
        redirect_uri: process.env.TWITTER_REDIRECT_URI
      }
    })
  }
}
