import { NextResponse } from 'next/server'

export async function GET() {
  const config = {
    client_id: process.env.TWITTER_CLIENT_ID ? 'Set ✅' : 'Missing ❌',
    client_secret: process.env.TWITTER_CLIENT_SECRET ? 'Set ✅' : 'Missing ❌',
    redirect_uri: process.env.TWITTER_REDIRECT_URI || 'Missing ❌',
    environment: process.env.NODE_ENV || 'development',
    
    // What should be configured in Twitter Developer Console
    required_settings: {
      callback_urls: [
        process.env.TWITTER_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/twitter/callback'
      ],
      website_url: process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000',
      app_permissions: 'Read and Write',
      oauth_version: '2.0',
      app_type: 'Web App, Automated App or Bot'
    },
    
    common_issues: [
      {
        issue: 'Callback URL mismatch',
        fix: `Ensure callback URL in Twitter Console exactly matches: ${process.env.TWITTER_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/twitter/callback'}`
      },
      {
        issue: 'Wrong permissions',
        fix: 'Set app permissions to "Read and Write" in Twitter Console'
      },
      {
        issue: 'OAuth 1.0 instead of 2.0',
        fix: 'Make sure you\'re using OAuth 2.0 settings, not OAuth 1.0a'
      },
      {
        issue: 'App not approved',
        fix: 'Some Twitter API access levels require approval'
      }
    ]
  }

  return NextResponse.json(config, { status: 200 })
}
