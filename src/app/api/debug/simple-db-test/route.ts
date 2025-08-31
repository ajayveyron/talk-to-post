import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('=== SIMPLE DATABASE TEST ===')
    
    // Basic environment check
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING', 
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? 'SET' : 'MISSING',
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? 'SET' : 'MISSING',
    }

    console.log('Environment variables:', envVars)

    // Test 1: Check if supabaseAdmin exists
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'supabaseAdmin is null',
        environment: envVars,
        diagnosis: 'SUPABASE_SERVICE_ROLE_KEY is missing or invalid'
      })
    }

    // Test 2: Try a simple query
    console.log('Testing database connection...')
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('Database connection failed:', testError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError,
        environment: envVars,
        diagnosis: 'Cannot connect to Supabase database - check service role key and URL'
      })
    }

    // Test 3: Get all accounts
    console.log('Fetching all accounts...')
    const { data: allAccounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('*')

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch accounts',
        details: accountsError,
        environment: envVars
      })
    }

    console.log('Found accounts:', allAccounts?.length || 0)

    // Analyze accounts
    const twitterAccounts = allAccounts?.filter(acc => acc.provider === 'twitter') || []
    const validTwitterAccounts = twitterAccounts.filter(acc => 
      acc.access_token && 
      acc.access_token !== 'DISCONNECTED' && 
      acc.access_token !== 'SUPABASE_MANAGED'
    )

    const accountsSummary = allAccounts?.map(acc => ({
      id: acc.id.substring(0, 8) + '...',
      provider: acc.provider,
      screen_name: acc.screen_name,
      access_token_status: !acc.access_token ? 'MISSING' :
                          acc.access_token === 'DISCONNECTED' ? 'DISCONNECTED' :
                          acc.access_token === 'SUPABASE_MANAGED' ? 'SUPABASE_MANAGED' :
                          'VALID',
      created_at: acc.created_at
    })) || []

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envVars,
      database: {
        connected: true,
        total_accounts: allAccounts?.length || 0,
        twitter_accounts: twitterAccounts.length,
        valid_twitter_accounts: validTwitterAccounts.length
      },
      accounts: accountsSummary,
      diagnosis: validTwitterAccounts.length > 0 
        ? '✅ Valid Twitter accounts found'
        : twitterAccounts.length > 0
        ? '⚠️ Twitter accounts exist but none are valid'
        : '❌ No Twitter accounts found',
      next_steps: validTwitterAccounts.length === 0 
        ? [
            'Sign in with Twitter on production to create account',
            'Check OAuth callback is working',
            'Verify database write permissions'
          ]
        : ['Twitter accounts available for posting']
    })

  } catch (error: any) {
    console.error('Simple DB test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }, { status: 500 })
  }
}
