import { NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'

export async function GET() {
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      process.env.TWITTER_REDIRECT_URI!,
      {
        scope: ['tweet.write', 'users.read', 'offline.access'],
      }
    )

    return NextResponse.json({
      status: 'Twitter OAuth URL Generated Successfully ✅',
      redirect_url: url,
      callback_configured: process.env.TWITTER_REDIRECT_URI,
      scopes: ['tweet.write', 'users.read', 'offline.access'],
      client_id: process.env.TWITTER_CLIENT_ID,
      next_steps: [
        '1. Copy the redirect_url above',
        '2. Visit it in your browser',
        '3. If you get the same error, the issue is in Twitter Developer Console',
        '4. Check: Callback URLs, App Permissions, OAuth 2.0 settings'
      ]
    })
  } catch (error) {
    return NextResponse.json({
      status: 'Error generating OAuth URL ❌',
      error: error instanceof Error ? error.message : 'Unknown error',
      fix: 'Check your TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET'
    })
  }
}
