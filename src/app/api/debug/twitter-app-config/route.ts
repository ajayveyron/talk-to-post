import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'

    const config = {
      timestamp: new Date().toISOString(),
      application: {
        name: 'TalkToPost',
        description: 'Voice-to-Twitter posting application',
        website: baseUrl,
      },
      oauth2_settings: {
        type: 'OAuth 2.0',
        grant_type: 'Authorization Code with PKCE',
        redirect_uris: [
          `${baseUrl}/api/auth/twitter/direct-oauth`,
          `${baseUrl}/api/auth/twitter/callback`,
          'http://localhost:3000/api/auth/twitter/direct-oauth',
          'http://localhost:3000/api/auth/twitter/callback',
          'http://127.0.0.1:3000/api/auth/twitter/direct-oauth',
          'http://127.0.0.1:3000/api/auth/twitter/callback'
        ],
        scopes: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'offline.access'
        ]
      },
      current_environment: {
        base_url: baseUrl,
        redirect_uri_in_use: `${baseUrl}/api/auth/twitter/direct-oauth`,
        node_env: process.env.NODE_ENV,
        has_twitter_credentials: {
          client_id: !!process.env.TWITTER_CLIENT_ID,
          client_secret: !!process.env.TWITTER_CLIENT_SECRET,
          redirect_uri: !!process.env.TWITTER_REDIRECT_URI,
        }
      },
      troubleshooting_steps: [
        {
          step: 1,
          title: 'Check Twitter Developer Portal Configuration',
          instructions: [
            'Go to https://developer.twitter.com/en/portal/dashboard',
            'Select your app',
            'Go to "App permissions" tab',
            'Ensure "Read and Write" permissions are selected'
          ]
        },
        {
          step: 2,
          title: 'Configure OAuth 2.0 Settings',
          instructions: [
            'Go to "Keys and tokens" tab',
            'Scroll down to "OAuth 2.0 Client ID and Client Secret"',
            'Ensure OAuth 2.0 is enabled',
            'Click "Edit" next to "Authentication settings"'
          ]
        },
        {
          step: 3,
          title: 'Add Correct Redirect URIs',
          instructions: [
            'In "Authentication settings", add these redirect URIs:',
            `${baseUrl}/api/auth/twitter/direct-oauth`,
            `${baseUrl}/api/auth/twitter/callback`,
            'http://localhost:3000/api/auth/twitter/direct-oauth',
            'http://localhost:3000/api/auth/twitter/callback',
            'http://127.0.0.1:3000/api/auth/twitter/direct-oauth',
            'http://127.0.0.1:3000/api/auth/twitter/callback'
          ]
        },
        {
          step: 4,
          title: 'Verify App Status',
          instructions: [
            'Ensure your app is not in "sandbox" mode',
            'Make sure the app is approved for production use',
            'Check if there are any app restrictions or suspensions'
          ]
        }
      ]
    }

    return NextResponse.json(config)

  } catch (error: any) {
    console.error('Twitter app config debug error:', error)
    return NextResponse.json({
      error: 'Failed to generate configuration guide',
      details: error.message
    }, { status: 500 })
  }
}
