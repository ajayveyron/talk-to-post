import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS) - only create if service key is available
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function for client components
export const createSupabaseClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Account {
  id: string
  user_id: string
  provider: 'twitter'
  access_token: string
  refresh_token?: string
  token_expires_at?: string
  screen_name?: string
  twitter_user_id?: string
  created_at: string
  updated_at: string
}

export interface Recording {
  id: string
  user_id: string
  storage_key: string
  status: 'uploaded' | 'transcribing' | 'drafting' | 'ready' | 'posted' | 'failed'
  file_size?: number
  duration_seconds?: number
  created_at: string
  updated_at: string
}

export interface Transcript {
  id: string
  recording_id: string
  text: string
  confidence?: number
  language?: string
  created_at: string
}

export interface Draft {
  id: string
  recording_id: string
  mode: 'tweet' | 'thread'
  thread: { text: string; char_count: number }[]
  original_text?: string
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  recording_id?: string
  account_id?: string
  draft_id?: string
  twitter_tweet_ids?: string[]
  posted_at?: string
  error?: string
  retry_count: number
  created_at: string
}
