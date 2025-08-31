import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('=== BUTTON FLOW TEST STARTED ===')

    // Test 1: Check if environment variables are available
    const envCheck = {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      twitter_client_id: !!process.env.TWITTER_CLIENT_ID,
      twitter_client_secret: !!process.env.TWITTER_CLIENT_SECRET,
      twitter_redirect_uri: !!process.env.TWITTER_REDIRECT_URI,
    }

    console.log('Environment check:', envCheck)

    // Test 2: Test direct OAuth endpoint accessibility
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    const testUrl = `${baseUrl}/api/auth/twitter/direct-login`

    console.log('Testing direct OAuth endpoint:', testUrl)

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects automatically
        headers: {
          'User-Agent': 'Button-Flow-Test/1.0'
        }
      })

      console.log('Direct OAuth endpoint response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        test_results: {
          environment: envCheck,
          direct_oauth_endpoint: {
            url: testUrl,
            status: response.status,
            statusText: response.statusText,
            accessible: response.status === 307,
            redirect_url: response.headers.get('location')?.substring(0, 100) + '...'
          }
        },
        conclusion: response.status === 307
          ? '✅ AUTHENTICATION SYSTEM IS WORKING!'
          : '❌ Authentication system has issues',
        next_steps: response.status === 307
          ? ['Click "Sign in with Twitter" button - it should work now!']
          : ['Check server logs for detailed error information']
      })

    } catch (fetchError: any) {
      console.error('Direct OAuth endpoint fetch error:', fetchError)

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        test_results: {
          environment: envCheck,
          direct_oauth_endpoint: {
            url: testUrl,
            error: fetchError.message,
            accessible: false
          }
        },
        conclusion: '❌ Cannot reach authentication endpoint',
        next_steps: [
          'Check if the development server is running',
          'Verify network connectivity',
          'Check server logs for detailed errors'
        ]
      })
    }

  } catch (error: any) {
    console.error('Button flow test error:', error)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error.message,
      conclusion: '❌ Test failed with unexpected error',
      next_steps: ['Check server logs for detailed error information']
    }, { status: 500 })
  }
}
