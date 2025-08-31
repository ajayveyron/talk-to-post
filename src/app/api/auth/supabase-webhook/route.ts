import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// This webhook handles Supabase auth events
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { type, record } = payload
    
    console.log('Supabase auth webhook received:', { type, userId: record?.id })
    
    // Handle user sign in/up events
    if (type === 'INSERT' && record?.raw_user_meta_data?.provider === 'twitter') {
      // Extract Twitter data from the user metadata
      const user = record
      const twitterData = user.raw_user_meta_data
      
      console.log('Twitter user signed up:', {
        userId: user.id,
        provider: twitterData.provider,
        provider_id: twitterData.provider_id,
        user_name: twitterData.user_name
      })
      
      // Store Twitter account info in our accounts table
      const { data: existingAccount } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'twitter')
        .single()
      
      if (!existingAccount) {
        // Create new Twitter account record
        const { error: accountError } = await supabaseAdmin
          .from('accounts')
          .insert({
            user_id: user.id,
            provider: 'twitter',
            access_token: twitterData.provider_token || '',
            refresh_token: twitterData.provider_refresh_token || null,
            screen_name: twitterData.user_name || twitterData.preferred_username,
            twitter_user_id: twitterData.provider_id || twitterData.sub,
            token_expires_at: null, // Twitter tokens from OAuth don't expire by default
          })
        
        if (accountError) {
          console.error('Failed to create Twitter account record:', accountError)
        } else {
          console.log('Twitter account record created successfully')
        }
      } else {
        // Update existing account with new token info
        const { error: updateError } = await supabaseAdmin
          .from('accounts')
          .update({
            access_token: twitterData.provider_token || '',
            refresh_token: twitterData.provider_refresh_token || null,
            screen_name: twitterData.user_name || twitterData.preferred_username,
            twitter_user_id: twitterData.provider_id || twitterData.sub,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('provider', 'twitter')
        
        if (updateError) {
          console.error('Failed to update Twitter account record:', updateError)
        } else {
          console.log('Twitter account record updated successfully')
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
