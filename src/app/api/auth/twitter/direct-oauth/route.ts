import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessionUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    console.log('Direct Twitter OAuth callback:', { code: !!code, state })

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=oauth_missing_params', request.url))
    }

    // Verify state and get code verifier from cookies
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value
    const storedState = request.cookies.get('twitter_state')?.value

    if (!codeVerifier || !storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/?error=oauth_verification_failed', request.url))
    }

    // Initialize Twitter client with your credentials
    const twitterClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    // Exchange code for tokens - use stable production domain
    let redirectUri: string
    
    if (process.env.NODE_ENV === 'production') {
      // Use stable Vercel domain in production
      redirectUri = 'https://talk-to-post.vercel.app/api/auth/twitter/direct-oauth'
    } else {
      // Use localhost in development
      redirectUri = 'http://localhost:3000/api/auth/twitter/direct-oauth'
    }
    
    console.log('Using callback redirect URI:', redirectUri)
    
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri,
    })

    console.log('Twitter OAuth successful, getting user info...')

    // Get user info
    const { data: twitterUser } = await loggedClient.v2.me({
      'user.fields': ['id', 'username', 'name', 'profile_image_url']
    })

    console.log('Twitter user info:', { 
      id: twitterUser.id, 
      username: twitterUser.username, 
      name: twitterUser.name,
      profile_image_url: twitterUser.profile_image_url 
    })

    // Create or update user in Supabase
    const userId = getSessionUserId(request)

    if (!supabaseAdmin) {
      console.error('Supabase admin client not available')
      return NextResponse.redirect(new URL('/?error=server_config_error', request.url))
    }

    // Check if Twitter account already exists
    const { data: existingAccount } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id')
      .eq('twitter_user_id', twitterUser.id)
      .single()

    let accountUserId = existingAccount?.user_id

    if (!existingAccount) {
      // Create new user if needed
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: `twitter-${twitterUser.id}@temp.example.com`,
        password: Math.random().toString(36),
        email_confirm: true,
        user_metadata: {
          twitter_id: twitterUser.id,
          twitter_username: twitterUser.username,
          twitter_name: twitterUser.name,
          twitter_profile_image: twitterUser.profile_image_url,
          provider: 'twitter'
        }
      })

      if (userError || !user.user) {
        console.error('Failed to create user:', userError)
        return NextResponse.redirect(new URL('/?error=user_creation_failed', request.url))
      }

      accountUserId = user.user.id

      // Create account record
      const { error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert({
          user_id: accountUserId,
          provider: 'twitter',
          access_token: accessToken,
          refresh_token: refreshToken || null,
          screen_name: twitterUser.username,
          twitter_user_id: twitterUser.id,
          token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
        })

      if (accountError) {
        console.error('Failed to create account record:', accountError)
        return NextResponse.redirect(new URL('/?error=account_creation_failed', request.url))
      }

      console.log('New Twitter account created successfully')
    } else {
      // Update existing account
      const { error: updateError } = await supabaseAdmin
        .from('accounts')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken || null,
          screen_name: twitterUser.username,
          token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id)

      if (updateError) {
        console.error('Failed to update account record:', updateError)
      }

      // Also update user metadata for existing users
      const { error: userUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        accountUserId,
        {
          user_metadata: {
            twitter_id: twitterUser.id,
            twitter_username: twitterUser.username,
            twitter_name: twitterUser.name,
            twitter_profile_image: twitterUser.profile_image_url,
            provider: 'twitter'
          }
        }
      )

      if (userUpdateError) {
        console.error('Failed to update user metadata:', userUpdateError)
      }

      console.log('Twitter account updated successfully')
    }

    // Create a session for the user using admin API
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `twitter-${twitterUser.id}@temp.example.com`,
      options: {
        redirectTo: `${request.nextUrl.origin}/?auth=success&twitter_user_id=${twitterUser.id}&twitter_username=${twitterUser.username}`
      }
    })

    if (sessionError || !sessionData) {
      console.error('Failed to create session:', sessionError)
      // Fallback to simple redirect
      const response = NextResponse.redirect(new URL('/?auth=success&twitter_user_id=' + twitterUser.id + '&twitter_username=' + twitterUser.username, request.url))
      response.cookies.delete('twitter_code_verifier')
      response.cookies.delete('twitter_state')
      return response
    }

    // Redirect to the magic link to establish the session
    if (sessionData.properties?.action_link) {
      return NextResponse.redirect(sessionData.properties.action_link)
    }

    // Fallback if no magic link
    const response = NextResponse.redirect(new URL('/?auth=success&twitter_user_id=' + twitterUser.id + '&twitter_username=' + twitterUser.username, request.url))
    response.cookies.delete('twitter_code_verifier')
    response.cookies.delete('twitter_state')
    return response

  } catch (error: any) {
    console.error('Direct Twitter OAuth error:', error)
    return NextResponse.redirect(new URL(`/?error=oauth_error&details=${encodeURIComponent(error.message)}`, request.url))
  }
}
