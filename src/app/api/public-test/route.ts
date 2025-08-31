import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Public test endpoint accessed')
    
    return NextResponse.json({
      success: true,
      message: 'Public API endpoint working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      test_status: 'API routes are accessible'
    })
  } catch (error: any) {
    console.error('Public test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
