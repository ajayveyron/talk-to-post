import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test basic connectivity
    const { data, error } = await supabaseAdmin
      .from('recordings')
      .select('count(*)')
      .limit(1)

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message,
        hint: 'Make sure you have run the schema.sql in your Supabase SQL Editor'
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      table_exists: true
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Test creating a user first (Supabase Auth)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true
    })

    if (authError && !authError.message.includes('already')) {
      return NextResponse.json({
        status: 'error',
        message: 'Auth user creation failed',
        error: authError.message
      })
    }

    const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000000'

    // Test inserting a recording
    const { data: recording, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: userId,
        storage_key: 'test/test-recording.webm',
        status: 'uploaded',
      })
      .select()
      .single()

    if (recordingError) {
      return NextResponse.json({
        status: 'error',
        message: 'Recording creation failed',
        error: recordingError.message,
        hint: 'Make sure you have run the schema.sql and created the auth user'
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database test successful',
      recording_id: recording.id,
      user_id: userId
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
