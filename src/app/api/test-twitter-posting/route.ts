import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { supabaseAdmin } from '@/lib/supabase'

interface TwitterError {
  code?: number
  message?: string
  status?: number
  data?: any
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Starting comprehensive Twitter posting test...')
    
    const demoUserId = '19013c64-1296-4f0c-975f-991d84c2258b'
    
    // Step 1: Check if Twitter account is connected
    console.log('1️⃣ Checking Twitter account connection...')
    const { data: accounts, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', demoUserId)
      .eq('provider', 'twitter')
      .order('created_at', { ascending: false })

    const account = accounts?.find(acc => acc.access_token !== 'DISCONNECTED')

    if (accountError || !account || account.access_token === 'DISCONNECTED') {
      return NextResponse.json({
        success: false,
        step: 'account_check',
        error: 'No Twitter account connected',
        details: accountError,
        recommendation: 'Connect your Twitter account first'
      }, { status: 400 })
    }

    console.log('✅ Twitter account found:', { 
      id: account.id, 
      screen_name: account.screen_name,
      token_expires_at: account.token_expires_at
    })

    // Step 2: Check and refresh token if needed
    console.log('2️⃣ Checking token expiration...')
    let accessToken = account.access_token
    let tokenStatus = 'valid'
    
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      console.log('⚠️ Token expired, attempting refresh...')
      tokenStatus = 'expired_refreshing'
      
      try {
        accessToken = await refreshTwitterToken(account)
        tokenStatus = 'refreshed'
        console.log('✅ Token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        return NextResponse.json({
          success: false,
          step: 'token_refresh',
          error: 'Token expired and refresh failed',
          details: refreshError instanceof Error ? refreshError.message : refreshError,
          recommendation: 'Disconnect and reconnect your Twitter account'
        }, { status: 401 })
      }
    }

    // Step 3: Initialize Twitter client and test basic authentication
    console.log('3️⃣ Testing Twitter client initialization...')
    const twitterClient = new TwitterApi(accessToken)
    
    try {
      // Test basic API access with a simple call
      const userInfo = await twitterClient.v2.me()
      console.log('✅ Twitter API authentication successful:', userInfo.data)
    } catch (authError: any) {
      console.error('❌ Twitter API authentication failed:', authError)
      return NextResponse.json({
        success: false,
        step: 'api_auth_test',
        error: 'Twitter API authentication failed',
        details: {
          message: authError.message,
          code: authError.code,
          status: authError.status,
          data: authError.data
        },
        recommendation: authError.status === 401 ? 
          'Token is invalid, disconnect and reconnect Twitter account' :
          'Check Twitter app permissions and configuration'
      }, { status: authError.status || 500 })
    }

    // Step 4: Test tweet posting with a test tweet
    console.log('4️⃣ Testing tweet posting...')
    const testTweets = [
      { 
        text: `🧪 Testing Voice-to-Twitter platform! ${new Date().toISOString().slice(0, 19)} #test`, 
        char_count: 0 
      }
    ]
    testTweets[0].char_count = testTweets[0].text.length

    let tweetIds: string[] = []
    try {
      tweetIds = await postTestThread(twitterClient, testTweets)
      console.log('✅ Test tweet posted successfully:', tweetIds)
    } catch (postError: any) {
      console.error('❌ Tweet posting failed:', postError)
      return NextResponse.json({
        success: false,
        step: 'tweet_posting',
        error: 'Failed to post test tweet',
        details: {
          message: postError.message,
          code: postError.code,
          status: postError.status,
          data: postError.data
        },
        recommendation: getPostingErrorRecommendation(postError)
      }, { status: 500 })
    }

    // Step 5: Clean up test tweet (delete it)
    console.log('5️⃣ Cleaning up test tweet...')
    try {
      for (const tweetId of tweetIds) {
        await twitterClient.v2.deleteTweet(tweetId)
        console.log(`✅ Deleted test tweet: ${tweetId}`)
      }
    } catch (deleteError) {
      console.warn('⚠️ Could not delete test tweet:', deleteError)
      // This is not critical for the test
    }

    // Test completed successfully
    return NextResponse.json({
      success: true,
      message: 'All Twitter posting tests passed!',
      test_results: {
        account_connected: true,
        token_status: tokenStatus,
        api_authentication: 'success',
        tweet_posting: 'success',
        cleanup: 'attempted'
      },
      account_info: {
        screen_name: account.screen_name,
        connected_at: account.created_at
      },
      recommendations: [
        'Twitter integration is working properly',
        'You can now post drafts to Twitter'
      ]
    })

  } catch (error: any) {
    console.error('❌ Test failed with unexpected error:', error)
    return NextResponse.json({
      success: false,
      step: 'unexpected_error',
      error: 'Unexpected error during testing',
      details: {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      },
      recommendation: 'Check server logs for more details'
    }, { status: 500 })
  }
}

async function postTestThread(
  client: TwitterApi,
  tweets: { text: string; char_count: number }[]
): Promise<string[]> {
  const tweetIds: string[] = []
  let replyToId: string | undefined

  for (const tweet of tweets) {
    const tweetOptions: any = {}
    if (replyToId) {
      tweetOptions.reply = { in_reply_to_tweet_id: replyToId }
    }

    const response = await client.v2.tweet(tweet.text, tweetOptions)
    
    if (response.data?.id) {
      tweetIds.push(response.data.id)
      replyToId = response.data.id
    }

    // Rate limiting - wait 500ms between tweets
    if (tweets.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return tweetIds
}

async function refreshTwitterToken(account: any): Promise<string> {
  if (!account.refresh_token) {
    throw new Error('No refresh token available')
  }

  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  })

  const {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
  } = await client.refreshOAuth2Token(account.refresh_token)

  // Update tokens in database
  const tokenExpiresAt = expiresIn 
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null

  await supabaseAdmin
    .from('accounts')
    .update({
      access_token: accessToken,
      refresh_token: newRefreshToken || account.refresh_token,
      token_expires_at: tokenExpiresAt,
    })
    .eq('id', account.id)

  return accessToken
}

function getPostingErrorRecommendation(error: TwitterError): string {
  if (error.code === 401 || error.status === 401) {
    return 'Authentication failed - disconnect and reconnect Twitter account'
  } else if (error.code === 403 || error.status === 403) {
    return 'App lacks required permissions - check Twitter app settings for tweet.write scope'
  } else if (error.code === 429) {
    return 'Rate limited - wait a few minutes before trying again'
  } else if (error.message?.includes('duplicate')) {
    return 'Duplicate tweet detected - this is normal for test tweets'
  }
  return 'Check Twitter app configuration and API permissions'
}

export async function GET() {
  return NextResponse.json({
    message: 'Twitter posting test endpoint',
    usage: 'Send a POST request to run comprehensive Twitter tests',
    tests: [
      'Account connection check',
      'Token validation and refresh',
      'API authentication test',
      'Tweet posting test',
      'Cleanup (delete test tweet)'
    ]
  })
}
