'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithTwitter: () => Promise<void>
  signOut: () => Promise<void>
  isTwitterConnected: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithTwitter: async () => {},
  signOut: async () => {},
  isTwitterConnected: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        
        // Handle Twitter account setup if needed
        if (session?.user && session.user.app_metadata?.provider === 'twitter') {
          await handleTwitterAccountSetup(session.user)
        }
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Handle Twitter account setup for new sign-ins
        if (event === 'SIGNED_IN' && session?.user && session.user.app_metadata?.provider === 'twitter') {
          await handleTwitterAccountSetup(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Handle OAuth callback success
  useEffect(() => {
    if (typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'success' && !user) {
      // OAuth was successful but no user session yet
      // Force a session refresh
      const refreshSession = async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (!error && session) {
            setSession(session)
            setUser(session.user)
            setLoading(false)
          }
        } catch (error) {
          console.error('Failed to refresh session:', error)
        }
      }
      
      // Try to refresh session after a short delay
      setTimeout(refreshSession, 1000)
    }
  }, [user, supabase.auth])
  
  const handleTwitterAccountSetup = async (user: User) => {
    try {
      // Check if we already have an account record for this user
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'twitter')
        .single()
      
      if (!existingAccount) {
        console.log('Setting up Twitter account for user:', user.id)
        
        // Create account record with available user metadata
        const { error: accountError } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            provider: 'twitter',
            access_token: 'SUPABASE_MANAGED', // Placeholder - Supabase manages the actual tokens
            screen_name: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
            twitter_user_id: user.user_metadata?.provider_id || user.user_metadata?.sub,
          })
        
        if (accountError) {
          console.error('Failed to create Twitter account record:', accountError)
        } else {
          console.log('Twitter account record created successfully')
        }
      }
    } catch (error) {
      console.error('Error setting up Twitter account:', error)
    }
  }

  const signInWithTwitter = async () => {
    console.log('Starting Twitter OAuth flow...')

    try {
      console.log('Redirecting to Twitter OAuth...')
      // Simply redirect to the OAuth endpoint - let the browser handle the 307 redirect
      window.location.href = '/api/auth/twitter/direct-login'
    } catch (error: any) {
      console.error('Twitter OAuth redirect error:', error)
      throw new Error(`Authentication failed: ${error.message}`)
    }
  }

  const signOut = async () => {
    try {
      // Clear Supabase session
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
      
      // Clear localStorage fallback
      if (typeof window !== 'undefined') {
        localStorage.removeItem('twitter_authenticated')
        localStorage.removeItem('twitter_user_id')
        localStorage.removeItem('twitter_username')
        localStorage.removeItem('twitter_connected')
      }
      
      // Clear local state immediately
      setUser(null)
      setSession(null)
      setLoading(false)
      
      // Redirect to home page to show sign-in UI
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      
      console.log('Successfully signed out and cleared all authentication state')
    } catch (error) {
      console.error('Error during sign out:', error)
      throw error
    }
  }

  // Check if the user has a Twitter provider
  const isTwitterConnected = !!(
    user?.app_metadata?.providers?.includes('twitter') ||
    user?.user_metadata?.provider === 'twitter'
  )

  const value = {
    user,
    session,
    loading,
    signInWithTwitter,
    signOut,
    isTwitterConnected,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
