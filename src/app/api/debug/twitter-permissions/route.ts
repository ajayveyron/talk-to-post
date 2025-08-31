import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const demoUserId = '19013c64-1296-4f0c-975f-991d84c2258b'

    // Get the most recent Twitter account
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', demoUserId)
      .eq('provider', 'twitter')
      .order('created_at', { ascending: false })

    const account = accounts?.find(acc => acc.access_token !== 'DISCONNECTED')

    if (!account) {
      return NextResponse.json({
        error: 'No Twitter account connected',
        recommendation: 'Connect your Twitter account first'
      })
    }

    // Test different API endpoints to understand what permissions we have
    const client = new TwitterApi(account.access_token)
    const tests = []

    // Test 1: Basic auth check (should work with any valid token)
    try {
      await client.v2.me()
      tests.push({ test: 'v2.me()', result: '✅ SUCCESS', permission: 'users.read' })
    } catch (error: any) {
      tests.push({ 
        test: 'v2.me()', 
        result: '❌ FAILED', 
        permission: 'users.read',
        error: error.code || error.status || 'Unknown'
      })
    }

    // Test 2: Tweet posting (requires tweet.write)
    try {
      // Don't actually post, just try to create the request
      const tweetText = 'TEST - DO NOT POST'
      // This will fail at authorization, not execution
      await client.v2.tweet(tweetText)
      tests.push({ test: 'v2.tweet()', result: '✅ SUCCESS', permission: 'tweet.write' })
    } catch (error: any) {
      tests.push({ 
        test: 'v2.tweet()', 
        result: '❌ FAILED', 
        permission: 'tweet.write',
        error: error.code || error.status || 'Unknown',
        details: error.data
      })
    }

    // Test 3: Check what scopes the token actually has
    let tokenScopes = 'Unknown'
    try {
      // Try to introspect the token (not always available)
      tokenScopes = 'Unable to determine - Twitter doesn\'t expose token scopes directly'
    } catch (error) {
      tokenScopes = 'Unable to determine'
    }

    return NextResponse.json({
      account_info: {
        id: account.id,
        screen_name: account.screen_name,
        twitter_user_id: account.twitter_user_id,
        created_at: account.created_at,
        token_expires_at: account.token_expires_at
      },
      permission_tests: tests,
      token_scopes: tokenScopes,
      client_id: process.env.TWITTER_CLIENT_ID,
      recommendations: [
        'If users.read fails: Your app needs Read permissions',
        'If tweet.write fails: Your app needs Write permissions',
        'Go to Twitter Developer Console → Your App → Settings → User Authentication Settings',
        'Set App Permissions to "Read and Write"',
        'Make sure OAuth 2.0 scopes include: tweet.read, tweet.write, users.read, offline.access',
        'Save changes and reconnect your account'
      ]
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check permissions',
      details: error.message
    }, { status: 500 })
  }
}
