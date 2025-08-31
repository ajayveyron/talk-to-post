import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { supabaseAdmin } from '@/lib/supabase'

interface TwitterError {
  code?: number
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const { draft_id } = await request.json()
    console.log('POST /api/post called with draft_id:', draft_id)

    if (!draft_id) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      )
    }

    // Get draft details
    console.log('Fetching draft details...')
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('drafts')
      .select(`
        *,
        recordings (
          user_id
        )
      `)
      .eq('id', draft_id)
      .single()

    if (draftError || !draft) {
      console.error('Draft fetch error:', draftError)
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    console.log('Draft found:', { id: draft.id, recording_id: draft.recording_id, user_id: draft.recordings?.user_id })

    // Try to find ANY valid Twitter account first (since we might have multiple)
    console.log('Searching for ANY valid Twitter account...')
    const { data: allAccounts, error: allAccountsError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('provider', 'twitter')
      .neq('access_token', 'DISCONNECTED')
      .neq('access_token', 'SUPABASE_MANAGED')
      .order('created_at', { ascending: false })

    if (allAccountsError) {
      console.error('Error fetching Twitter accounts:', allAccountsError)
    }

    console.log('Found Twitter accounts:', allAccounts?.length || 0)

    // First try to find account for the specific user
    let account = allAccounts?.find(acc => acc.user_id === draft.recordings?.user_id)
    
    // If no account for specific user, use any valid account (fallback)
    if (!account && allAccounts && allAccounts.length > 0) {
      console.log('No account for specific user, using latest valid account as fallback')
      account = allAccounts[0]
    }

    if (!account) {
      console.error('No valid Twitter account found')
      console.log('Available accounts debug:', allAccounts)
      return NextResponse.json(
        { error: 'Twitter account not connected. Please sign in with Twitter first.' },
        { status: 400 }
      )
    }

    console.log('Twitter account found:', { id: account.id, screen_name: account.screen_name })

    // Check if token needs refresh
    let accessToken = account.access_token
    if (account.token_expires_at && new Date(account.token_expires_at) <= new Date()) {
      console.log('Token expired, refreshing...')
      try {
        accessToken = await refreshTwitterToken(account)
        console.log('Token refreshed successfully')
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        return NextResponse.json(
          { 
            error: 'Twitter token expired and refresh failed. Please reconnect your Twitter account.',
            needsReconnect: true
          },
          { status: 401 }
        )
      }
    }

    // Initialize Twitter client
    console.log('Initializing Twitter client with access token...')
    const twitterClient = new TwitterApi(accessToken)

    // Post tweets
    console.log('Posting thread:', draft.thread)
    
    // Check if we should use mock posting (for testing)
    const useMockPosting = false // Disabled for real Twitter posting test
    
    let tweetIds
    if (useMockPosting) {
      console.log('Using mock Twitter posting for testing...')
      tweetIds = draft.thread.map((_: any, index: number) => `mock-tweet-${Date.now()}-${index}`)
      console.log('Mock tweet IDs:', tweetIds)
    } else {
      tweetIds = await postThread(twitterClient, draft.thread)
      console.log('Thread posted successfully, tweet IDs:', tweetIds)
    }

    // Save post record
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        recording_id: draft.recording_id,
        account_id: account.id,
        draft_id: draft_id,
        twitter_tweet_ids: tweetIds,
        posted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (postError) {
      console.error('Database error:', postError)
      return NextResponse.json(
        { error: 'Failed to save post record' },
        { status: 500 }
      )
    }

    // Update recording status to posted
    await supabaseAdmin
      .from('recordings')
      .update({ status: 'posted' })
      .eq('id', draft.recording_id)

    return NextResponse.json({
      post_id: post.id,
      tweet_ids: tweetIds,
      mode: draft.mode,
      posted_at: post.posted_at,
    })
  } catch (error: any) {
    console.error('Post creation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: error.code,
      data: error.data,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    })
    
    const body = await request.json().catch(() => ({}))
    if (body.draft_id) {
      // Save error in posts table
      await supabaseAdmin
        .from('posts')
        .insert({
          draft_id: body.draft_id,
          error: error instanceof Error ? error.message : String(error),
          retry_count: 0,
        })
    }

    return NextResponse.json(
      { 
        error: 'Failed to post to Twitter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function postThread(
  client: TwitterApi,
  tweets: { text: string; char_count: number }[]
): Promise<string[]> {
  const tweetIds: string[] = []
  let replyToId: string | undefined

  for (const tweet of tweets) {
    try {
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
    } catch (error: any) {
      console.error('Tweet posting error:', error)
      
      // Enhanced error logging
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        data: error.data,
        headers: error.headers
      })
      
      // If it's a rate limit error, wait and retry once
      const twitterError = error as TwitterError
      if (twitterError.code === 429) {
        console.log('Rate limited, waiting 5 seconds before retry...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        try {
          const tweetOptions: any = {}
          if (replyToId) {
            tweetOptions.reply = { in_reply_to_tweet_id: replyToId }
          }
          const response = await client.v2.tweet(tweet.text, tweetOptions)
          if (response.data?.id) {
            tweetIds.push(response.data.id)
            replyToId = response.data.id
          }
        } catch (retryError) {
          throw new Error(`Failed to post tweet after retry: ${retryError}`)
        }
      } else if (twitterError.code === 401 || error.status === 401) {
        throw new Error('Twitter authentication failed. Token may be expired or invalid. Please reconnect your Twitter account.')
      } else if (twitterError.code === 403 || error.status === 403) {
        throw new Error('Twitter API access denied. Your app may not have the required permissions to post tweets.')
      } else {
        throw error
      }
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

  try {
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
  } catch (error) {
    console.error('Token refresh error:', error)
    throw new Error('Failed to refresh Twitter token')
  }
}
