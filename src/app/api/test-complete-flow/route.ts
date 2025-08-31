import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const tests = {
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        twitter_client_id: !!process.env.TWITTER_CLIENT_ID,
        twitter_client_secret: !!process.env.TWITTER_CLIENT_SECRET,
        twitter_redirect_uri: !!process.env.TWITTER_REDIRECT_URI,
      },
      tests: []
    }

    // Test 1: Supabase OAuth endpoint
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const testUrl = `${supabaseUrl}/auth/v1/authorize?provider=twitter&redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback`

      const response = await fetch(testUrl, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json'
        }
      })

      tests.tests.push({
        name: 'Supabase Twitter OAuth Endpoint',
        status: response.status === 404 ? 'FAILED' : 'PASSED',
        status_code: response.status,
        expected: '404 (Twitter not enabled)',
        actual: response.status,
        error: response.status === 404 ? '"requested path is invalid"' : null
      })
    } catch (error: any) {
      tests.tests.push({
        name: 'Supabase Twitter OAuth Endpoint',
        status: 'ERROR',
        error: error.message
      })
    }

    // Test 2: Direct Twitter OAuth endpoint
    try {
      const directResponse = await fetch('http://localhost:3000/api/auth/twitter/direct-login', {
        redirect: 'manual' // Don't follow redirects
      })

      tests.tests.push({
        name: 'Direct Twitter OAuth Endpoint',
        status: directResponse.status === 307 ? 'PASSED' : 'FAILED',
        status_code: directResponse.status,
        expected: '307 (redirect to Twitter)',
        actual: directResponse.status,
        redirect_url: directResponse.status === 307 ? directResponse.headers.get('location')?.substring(0, 50) + '...' : null
      })
    } catch (error: any) {
      tests.tests.push({
        name: 'Direct Twitter OAuth Endpoint',
        status: 'ERROR',
        error: error.message
      })
    }

    // Test 3: Debug OAuth endpoint
    try {
      const debugResponse = await fetch('http://localhost:3000/api/debug-oauth')
      const debugData = await debugResponse.json()

      tests.tests.push({
        name: 'OAuth Debug Endpoint',
        status: debugData.success ? 'PASSED' : 'FAILED',
        response: debugData.diagnosis
      })
    } catch (error: any) {
      tests.tests.push({
        name: 'OAuth Debug Endpoint',
        status: 'ERROR',
        error: error.message
      })
    }

    // Overall assessment
    const supabaseFailed = tests.tests.find(t => t.name === 'Supabase Twitter OAuth Endpoint')?.status === 'FAILED'
    const directPassed = tests.tests.find(t => t.name === 'Direct Twitter OAuth Endpoint')?.status === 'PASSED'

    let overall_status = 'UNKNOWN'
    let recommendation = ''

    if (supabaseFailed && directPassed) {
      overall_status = '✅ WORKING (Direct OAuth Fallback)'
      recommendation = 'Direct Twitter OAuth is working! The "Sign in with Twitter" button will automatically fall back to direct OAuth when Supabase Twitter provider is not enabled.'
    } else if (supabaseFailed && !directPassed) {
      overall_status = '❌ BROKEN'
      recommendation = 'Both Supabase and Direct OAuth are failing. Check your Twitter app configuration and environment variables.'
    } else {
      overall_status = '✅ WORKING'
      recommendation = 'Everything is working correctly!'
    }

    return NextResponse.json({
      ...tests,
      summary: {
        overall_status,
        recommendation,
        next_steps: supabaseFailed ? [
          '1. Enable Twitter provider in Supabase Dashboard',
          '2. Configure your Twitter app credentials',
          '3. Set redirect URLs in both Supabase and Twitter Developer Portal',
          '4. Test the authentication flow'
        ] : ['Authentication is ready to use!']
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
