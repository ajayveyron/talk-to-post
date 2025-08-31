import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('=== CHECKING TWITTER STATUS ===')

    // Get ALL Twitter accounts in the database
    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('provider', 'twitter')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error
      }, { status: 500 })
    }

    const validAccounts = accounts?.filter(acc => 
      acc.access_token && 
      acc.access_token !== 'DISCONNECTED' && 
      acc.access_token !== 'SUPABASE_MANAGED'
    ) || []

    const accountsSummary = accounts?.map(acc => ({
      id: acc.id,
      user_id: acc.user_id,
      screen_name: acc.screen_name,
      twitter_user_id: acc.twitter_user_id,
      access_token_status: acc.access_token === 'DISCONNECTED' ? 'DISCONNECTED' :
                          acc.access_token === 'SUPABASE_MANAGED' ? 'SUPABASE_MANAGED' :
                          acc.access_token ? 'VALID' : 'MISSING',
      created_at: acc.created_at,
      updated_at: acc.updated_at
    })) || []

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_accounts: accounts?.length || 0,
        valid_accounts: validAccounts.length,
        has_usable_account: validAccounts.length > 0
      },
      accounts: accountsSummary,
      latest_valid_account: validAccounts[0] ? {
        id: validAccounts[0].id,
        screen_name: validAccounts[0].screen_name,
        twitter_user_id: validAccounts[0].twitter_user_id,
        created_at: validAccounts[0].created_at
      } : null,
      recommendation: validAccounts.length > 0 
        ? '✅ Twitter account is available for posting'
        : '❌ No valid Twitter account found. Please sign in with Twitter.'
    })

  } catch (error: any) {
    console.error('Twitter status check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during status check',
      details: error.message
    }, { status: 500 })
  }
}
