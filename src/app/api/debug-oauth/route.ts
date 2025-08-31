import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    const redirectUrl = `${baseUrl}/auth/callback`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    console.log('🔍 Debug OAuth attempt:', {
      baseUrl,
      redirectUrl,
      supabaseUrl,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })

    // First, let's try to access the OAuth endpoint directly to see what happens
    const directTestUrl = `${supabaseUrl}/auth/v1/authorize?provider=twitter&redirect_to=${encodeURIComponent(redirectUrl)}`

    console.log('🌐 Direct OAuth URL test:', directTestUrl)

    try {
      const directResponse = await fetch(directTestUrl, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json'
        }
      })

      console.log('📊 Direct OAuth response status:', directResponse.status)
      console.log('📊 Direct OAuth response headers:', Object.fromEntries(directResponse.headers.entries()))

      if (!directResponse.ok) {
        const errorText = await directResponse.text()
        console.log('❌ Direct OAuth error response:', errorText)

        return NextResponse.json({
          success: false,
          timestamp: new Date().toISOString(),
          test_type: 'direct_oauth_endpoint',
          url_tested: directTestUrl,
          response_status: directResponse.status,
          response_statusText: directResponse.statusText,
          response_body: errorText,
          diagnosis: errorText.includes('requested path is invalid')
            ? '❌ CRITICAL: Twitter provider is NOT enabled in Supabase dashboard'
            : '❌ OAuth endpoint returned error',
          solution: errorText.includes('requested path is invalid')
            ? 'Go to Supabase Dashboard → Authentication → Providers → Enable Twitter provider'
            : 'Check your Supabase Twitter provider configuration'
        })
      }

      // If we get here, the direct endpoint works
      console.log('✅ Direct OAuth endpoint is accessible')
      const successText = await directResponse.text()
      console.log('✅ Direct OAuth success response:', successText)

    } catch (directError: any) {
      console.log('❌ Direct OAuth fetch error:', directError)

      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        test_type: 'direct_oauth_endpoint',
        error_type: 'network_error',
        error_message: directError.message,
        diagnosis: '❌ Cannot reach Supabase OAuth endpoint. Check your internet connection and Supabase URL.',
        supabase_url: supabaseUrl
      })
    }

    // If direct test passes, try the Supabase client method
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: redirectUrl,
        scopes: 'tweet.read tweet.write users.read offline.access'
      }
    })

    if (error) {
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        test_type: 'supabase_client_oauth',
        error: error.message,
        error_code: error.status,
        error_name: error.name,
        redirect_url: redirectUrl,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        diagnosis: error.message.includes('requested path is invalid')
          ? '❌ Twitter provider is not enabled in Supabase dashboard'
          : '❌ OAuth configuration issue',
        solution: 'Go to https://supabase.com/dashboard → Select your project → Authentication → Providers → Enable Twitter'
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      test_type: 'full_oauth_test',
      oauth_url: data.url,
      provider: data.provider,
      redirect_url: redirectUrl,
      diagnosis: '✅ OAuth setup appears to be working correctly!'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      test_type: 'unexpected_error',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
      env_check: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
        origin: request.headers.get('origin')
      },
      diagnosis: '❌ Unexpected error occurred during OAuth debugging'
    }, { status: 500 })
  }
}
