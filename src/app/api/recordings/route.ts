import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // TODO: Get actual user from session/auth
    // For demo purposes, use the latest demo user
    const userId = '19013c64-1296-4f0c-975f-991d84c2258b' // Demo user for testing

    // Generate unique storage key
    const timestamp = new Date().toISOString()
    const storageKey = `${userId}/${Date.now()}-recording.webm`

    // Create recording record in database
    const { data: recording, error: dbError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: userId,
        storage_key: storageKey,
        status: 'uploaded',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create recording record' },
        { status: 500 }
      )
    }

    // Generate presigned URL for upload
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('audio-recordings')
      .createSignedUploadUrl(storageKey, {
        upsert: false,
      })

    if (urlError) {
      console.error('Storage URL error:', urlError)
      return NextResponse.json(
        { error: 'Failed to generate upload URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      recording_id: recording.id,
      upload_url: urlData.signedUrl,
      storage_key: storageKey,
    })
  } catch (error) {
    console.error('Recording creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Get actual user from session/auth
    const userId = '19013c64-1296-4f0c-975f-991d84c2258b' // Demo user for testing

    const { data: recordings, error } = await supabaseAdmin
      .from('recordings')
      .select(`
        *,
        transcripts (*),
        drafts (*),
        posts (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recordings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ recordings })
  } catch (error) {
    console.error('Recording fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
