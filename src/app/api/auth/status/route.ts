import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        connected: false,
        user: null
      })
    }
    
    // Check if user signed in with Twitter
    const isTwitterConnected = !!(
      user.app_metadata?.providers?.includes('twitter') ||
      user.user_metadata?.provider === 'twitter'
    )
    
    return NextResponse.json({
      authenticated: true,
      connected: isTwitterConnected,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.user_name,
        avatar: user.user_metadata?.avatar_url,
        provider: user.user_metadata?.provider
      }
    })
  } catch (error) {
    console.error('Error checking auth status:', error)
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    )
  }
}
