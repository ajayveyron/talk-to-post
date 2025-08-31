import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Create a demo user for testing the real APIs
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `demo-${Date.now()}@example.com`,
      password: 'demopassword123',
      email_confirm: true
    })

    if (authError && !authError.message.includes('already')) {
      return NextResponse.json({
        status: 'error',
        error: authError.message
      })
    }

    const userId = authData?.user?.id

    return NextResponse.json({
      status: 'success',
      message: 'Demo user created for testing real APIs',
      user_id: userId,
      note: 'Use this user_id for testing the real API endpoints'
    })

  } catch (error) {
    console.error('Demo user creation error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
