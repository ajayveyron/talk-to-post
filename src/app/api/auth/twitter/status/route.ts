import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // For now, check if any Twitter account is connected for the demo user
    // In a real app, you'd check for the authenticated user
    const demoUserId = '19013c64-1296-4f0c-975f-991d84c2258b'

    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select('id, screen_name, created_at, access_token')
      .eq('user_id', demoUserId)
      .eq('provider', 'twitter')
      .order('created_at', { ascending: false }) // Get most recent first

    if (error) {
      console.error('Error checking Twitter status:', error)
      return NextResponse.json({ connected: false })
    }

    // Find the most recent account with a valid (non-disconnected) token
    const validAccount = accounts?.find(acc => acc.access_token !== 'DISCONNECTED')

    return NextResponse.json({
      connected: !!validAccount,
      account: validAccount ? {
        screen_name: validAccount.screen_name,
        connected_at: validAccount.created_at,
      } : null,
    })
  } catch (error) {
    console.error('Twitter status check error:', error)
    return NextResponse.json({ connected: false })
  }
}
