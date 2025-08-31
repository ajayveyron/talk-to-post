import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.headers.get('origin') || request.url
    
    // Check environment variables (safely)
    const envCheck = {
      node_env: process.env.NODE_ENV,
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      has_twitter_client_id: !!process.env.TWITTER_CLIENT_ID,
      has_twitter_client_secret: !!process.env.TWITTER_CLIENT_SECRET,
      has_twitter_redirect_uri: !!process.env.TWITTER_REDIRECT_URI,
      twitter_redirect_uri: process.env.TWITTER_REDIRECT_URI,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }

    // Test database connection
    let dbStatus = 'unknown'
    let accountsCount = 0
    let twitterAccountsCount = 0
    let validTwitterAccountsCount = 0
    let dbError = null

    try {
      if (supabaseAdmin) {
        // Test basic connection
        const { data: testData, error: testError } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .limit(1)

        if (testError) {
          dbStatus = 'connection_failed'
          dbError = testError.message
        } else {
          dbStatus = 'connected'
          
          // Get accounts statistics
          const { data: allAccounts } = await supabaseAdmin
            .from('accounts')
            .select('*')

          accountsCount = allAccounts?.length || 0
          
          const twitterAccounts = allAccounts?.filter(acc => acc.provider === 'twitter') || []
          twitterAccountsCount = twitterAccounts.length
          
          const validTwitterAccounts = twitterAccounts.filter(acc => 
            acc.access_token && 
            acc.access_token !== 'DISCONNECTED' && 
            acc.access_token !== 'SUPABASE_MANAGED'
          )
          validTwitterAccountsCount = validTwitterAccounts.length
        }
      } else {
        dbStatus = 'no_admin_client'
        dbError = 'supabaseAdmin is null - check SUPABASE_SERVICE_ROLE_KEY'
      }
    } catch (error: any) {
      dbStatus = 'error'
      dbError = error.message
    }

    // Check if this is production
    const isProduction = baseUrl.includes('vercel.app') || process.env.NODE_ENV === 'production'

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        is_production: isProduction,
        base_url: baseUrl,
        ...envCheck
      },
      database: {
        status: dbStatus,
        error: dbError,
        statistics: {
          total_accounts: accountsCount,
          twitter_accounts: twitterAccountsCount,
          valid_twitter_accounts: validTwitterAccountsCount
        }
      },
      diagnosis: dbStatus === 'connected' && validTwitterAccountsCount > 0 
        ? '✅ Everything looks good'
        : dbStatus !== 'connected'
        ? `❌ Database issue: ${dbError}`
        : validTwitterAccountsCount === 0
        ? '⚠️ No valid Twitter accounts found in production database'
        : '❓ Unknown issue',
      next_steps: dbStatus !== 'connected'
        ? ['Check SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables', 'Verify Supabase project URL is correct']
        : validTwitterAccountsCount === 0
        ? ['Connect Twitter account on production', 'Check if OAuth callback is working', 'Verify database write permissions']
        : ['Check application logs for specific errors']
    })

  } catch (error: any) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Failed to run production diagnostics',
      details: error.message,
      diagnosis: '❌ Critical environment issue'
    }, { status: 500 })
  }
}
