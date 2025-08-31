import { NextRequest, NextResponse } from 'next/server'
import { TwitterApi } from 'twitter-api-v2'
import { supabaseAdmin } from '@/lib/supabase'
import { getTwitterRedirectUri } from '@/lib/urls'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    console.log('OAuth callback received:', { code: !!code, state: !!state })

    if (!code || !state) {
      console.error('Missing code or state:', { code: !!code, state: !!state })
      return NextResponse.redirect(new URL('/?error=oauth_missing_params', request.url))
    }

    // Verify state and get code verifier from cookies
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value
    const storedState = request.cookies.get('twitter_state')?.value

    console.log('Cookie verification:', { 
      codeVerifier: !!codeVerifier, 
      storedState: !!storedState, 
      stateMatch: storedState === state 
    })

    if (!codeVerifier || !storedState) {
      console.error('Missing cookies:', { codeVerifier: !!codeVerifier, storedState: !!storedState })
      return NextResponse.redirect(new URL('/?error=oauth_missing_cookies', request.url))
    }

    if (storedState !== state) {
      console.error('State mismatch:', { expected: storedState, received: state })
      return NextResponse.redirect(new URL('/?error=oauth_state_mismatch', request.url))
    }

    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    })

    const redirectUri = getTwitterRedirectUri()
    console.log('Attempting token exchange with:', {
      redirectUri,
      clientId: process.env.TWITTER_CLIENT_ID
    })

    // Exchange code for access token
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri,
    })

    console.log('Token exchange successful, getting user info...')

    // Get user info - handle permissions issues
    let userObject
    try {
      const response = await loggedClient.v2.me({
        'user.fields': ['id', 'username', 'name', 'profile_image_url']
      })
      userObject = response.data
      console.log('User info retrieved:', { id: userObject.id, username: userObject.username })
    } catch (userInfoError: any) {
      console.error('User info error (403 - permissions issue):', userInfoError.data)
      // For 403 errors, create a minimal user object
      userObject = {
        id: 'twitter_user_' + Date.now(),
        username: 'twitter_user',
        name: 'Twitter User'
      }
      console.log('Using fallback user object due to permissions:', userObject)
    }

    // Create or find user in Supabase auth
    let userId: string
    try {
      // Try to find existing user by Twitter ID
      const { data: existingAccount } = await supabaseAdmin
        .from('accounts')
        .select('user_id')
        .eq('twitter_user_id', userObject.id)
        .eq('provider', 'twitter')
        .single()

      if (existingAccount) {
        userId = existingAccount.user_id
        console.log('Found existing user:', userId)
      } else {
        // Create new user in Supabase Auth
        const email = `${userObject.username || userObject.id}@twitter.local`
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: Math.random().toString(36).substring(2),
          email_confirm: true,
          user_metadata: {
            twitter_id: userObject.id,
            twitter_username: userObject.username,
            twitter_name: userObject.name,
            provider: 'twitter'
          }
        })

        if (userError || !newUser.user) {
          console.error('Failed to create user:', userError)
          // Fallback to session-based ID
          userId = `user-${Date.now()}-${Math.random().toString(36).substring(2)}`
        } else {
          userId = newUser.user.id
          console.log('Created new user:', userId)
        }
      }
    } catch (error) {
      console.error('Error handling user creation:', error)
      // Fallback to session-based ID
      userId = `user-${Date.now()}-${Math.random().toString(36).substring(2)}`
    }

    // Calculate token expiration
    const tokenExpiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    // Store account in database
    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .upsert({
        user_id: userId,
        provider: 'twitter',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        screen_name: userObject.username,
        twitter_user_id: userObject.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save account' },
        { status: 500 }
      )
    }

    // Clear cookies
    const response = NextResponse.redirect(new URL('/?twitter=connected', request.url))
    response.cookies.delete('twitter_code_verifier')
    response.cookies.delete('twitter_state')

    // Set success cookie and user session
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set('twitter_connected', 'true', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
    })
    
    // Set user session cookie
    response.cookies.set('user_session', userId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Twitter OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url))
  }
}
