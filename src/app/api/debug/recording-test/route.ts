import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing recording system components...')
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: [] as any[]
    }

    // Test 1: Supabase Admin Connection
    try {
      if (!supabaseAdmin) {
        results.tests.push({
          name: 'Supabase Admin Client',
          status: 'FAIL',
          error: 'supabaseAdmin is null - check SUPABASE_SERVICE_ROLE_KEY'
        })
      } else {
        const { data, error } = await supabaseAdmin
          .from('recordings')
          .select('id')
          .limit(1)
        
        results.tests.push({
          name: 'Supabase Admin Client',
          status: error ? 'FAIL' : 'PASS',
          error: error?.message,
          details: `Query returned ${data?.length || 0} rows`
        })
      }
    } catch (error: any) {
      results.tests.push({
        name: 'Supabase Admin Client',
        status: 'FAIL',
        error: error.message
      })
    }

    // Test 2: Storage Bucket Access
    try {
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
      
      results.tests.push({
        name: 'Storage Buckets',
        status: bucketsError ? 'FAIL' : 'PASS',
        error: bucketsError?.message,
        details: buckets?.map(b => b.name) || []
      })

      // Check audio-recordings bucket specifically
      if (buckets) {
        const hasAudioBucket = buckets.some(b => b.name === 'audio-recordings')
        results.tests.push({
          name: 'Audio Recordings Bucket',
          status: hasAudioBucket ? 'PASS' : 'FAIL',
          error: hasAudioBucket ? null : 'audio-recordings bucket not found',
          details: `Available buckets: ${buckets.map(b => b.name).join(', ')}`
        })
      }
    } catch (error: any) {
      results.tests.push({
        name: 'Storage Buckets',
        status: 'FAIL',
        error: error.message
      })
    }

    // Test 3: Environment Variables
    const envVars = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
      VERCEL_URL: process.env.VERCEL_URL || 'NOT_SET',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT_SET'
    }

    results.tests.push({
      name: 'Environment Variables',
      status: 'INFO',
      details: envVars
    })

    // Test 4: URL Construction for API calls
    const baseUrl = process.env.NEXTAUTH_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   request.headers.get('origin') ||
                   'http://localhost:3000'

    results.tests.push({
      name: 'API Base URL Detection',
      status: 'INFO',
      details: {
        detected_base_url: baseUrl,
        transcribe_url: `${baseUrl}/api/transcribe`,
        draft_url: `${baseUrl}/api/draft`
      }
    })

    const overallStatus = results.tests.some(t => t.status === 'FAIL') ? 'FAIL' : 'PASS'

    return NextResponse.json({
      success: overallStatus === 'PASS',
      overall_status: overallStatus,
      ...results
    })
  } catch (error: any) {
    console.error('Recording test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
