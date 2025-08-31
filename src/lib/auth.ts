import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'
import { createSupabaseServerClient } from './supabase-server'

// Get the current authenticated user from Supabase
export async function getCurrentUser(request?: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('No authenticated user found')
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Get user ID from authenticated user or create anonymous session
export async function getOrCreateUser(request: NextRequest): Promise<string> {
  // First try to get authenticated user
  const user = await getCurrentUser(request)
  if (user) {
    return user.id
  }
  
  // Fallback to session-based user for unauthenticated requests
  let userId = request.cookies.get('user_session')?.value
  
  if (!userId) {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available, using fallback user ID')
      return '19013c64-1296-4f0c-975f-991d84c2258b'
    }
    
    // Create a new anonymous user for demo purposes
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: `user-${Date.now()}@example.com`,
      password: Math.random().toString(36),
      email_confirm: true
    })
    
    if (error || !user.user) {
      console.error('Failed to create user:', error)
      // Fallback to demo user for now
      return '19013c64-1296-4f0c-975f-991d84c2258b'
    }
    
    userId = user.user.id
  }
  
  return userId
}

export function createUserSession(userId: string): { name: string; value: string; options: any } {
  return {
    name: 'user_session',
    value: userId,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    }
  }
}

// Get user ID for authenticated user, or generate session-based ID
export function getSessionUserId(request: NextRequest): string {
  // Try to get existing user session
  let userId = request.cookies.get('user_session')?.value
  
  if (!userId) {
    // Generate a new session-based user ID
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2)}`
  }
  
  return userId
}

// Get Twitter access token for the current user
export async function getUserTwitterToken(userId: string): Promise<string | null> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available')
      return null
    }
    
    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .select('access_token')
      .eq('user_id', userId)
      .eq('provider', 'twitter')
      .single()
    
    if (error || !account) {
      console.log('No Twitter account found for user:', userId)
      return null
    }
    
    return account.access_token
  } catch (error) {
    console.error('Error getting Twitter token:', error)
    return null
  }
}
