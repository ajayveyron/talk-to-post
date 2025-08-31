import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const demoUserId = '19013c64-1296-4f0c-975f-991d84c2258b' // Demo user ID

    // Instead of deleting, clear the tokens to effectively disconnect
    // This preserves post history while invalidating the connection
    const { error } = await supabaseAdmin
      .from('accounts')
      .update({
        access_token: 'DISCONNECTED',
        refresh_token: null,
        token_expires_at: '1970-01-01T00:00:00.000Z', // Expired timestamp
        updated_at: new Date().toISOString()
      })
      .eq('user_id', demoUserId)
      .eq('provider', 'twitter')

    if (error) {
      console.error('Error disconnecting Twitter account:', error)
      return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Twitter account disconnected successfully' 
    }, { status: 200 })
  } catch (error) {
    console.error('Error in disconnect endpoint:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
