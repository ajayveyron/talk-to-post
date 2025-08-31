import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const demoUserId = '19013c64-1296-4f0c-975f-991d84c2258b'

    // Get all accounts for the demo user
    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', demoUserId)
      .eq('provider', 'twitter')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      count: accounts?.length || 0,
      accounts: accounts?.map(acc => ({
        id: acc.id,
        screen_name: acc.screen_name,
        twitter_user_id: acc.twitter_user_id,
        access_token: acc.access_token?.substring(0, 20) + '...',
        created_at: acc.created_at,
        token_expires_at: acc.token_expires_at
      })) || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const demoUserId = '19013c64-1296-4f0c-975f-991d84c2258b'

    // Delete all Twitter accounts for the demo user
    const { error } = await supabaseAdmin
      .from('accounts')
      .update({
        access_token: 'DISCONNECTED',
        refresh_token: null,
        token_expires_at: '1970-01-01T00:00:00.000Z'
      })
      .eq('user_id', demoUserId)
      .eq('provider', 'twitter')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'All Twitter accounts disconnected' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
