import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.headers.get('origin') || new URL(request.url).origin
    
    // Test OAuth callback flow step by step
    const tests = []

    // Test 1: Environment Variables
    const hasTwitterCredentials = !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET)
    tests.push({
      name: 'Twitter Credentials',
      status: hasTwitterCredentials ? 'PASS' : 'FAIL',
      details: hasTwitterCredentials ? 'Twitter client ID and secret are set' : 'Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET'
    })

    // Test 2: Redirect URI Configuration
    const expectedRedirectUri = `${baseUrl}/api/auth/twitter/direct-oauth`
    const configuredRedirectUri = process.env.TWITTER_REDIRECT_URI
    const redirectUriMatch = configuredRedirectUri === expectedRedirectUri
    tests.push({
      name: 'Redirect URI Configuration',
      status: redirectUriMatch ? 'PASS' : 'WARN',
      details: `Expected: ${expectedRedirectUri}, Configured: ${configuredRedirectUri}`,
      recommendation: redirectUriMatch ? null : `Update TWITTER_REDIRECT_URI to ${expectedRedirectUri}`
    })

    // Test 3: Database Connection
    let dbTest = { name: 'Database Connection', status: 'FAIL', details: 'Unknown error' }
    try {
      if (!supabaseAdmin) {
        dbTest = {
          name: 'Database Connection',
          status: 'FAIL',
          details: 'Supabase admin client is null - check SUPABASE_SERVICE_ROLE_KEY'
        }
      } else {
        const { error } = await supabaseAdmin.from('accounts').select('id').limit(1)
        if (error) {
          dbTest = {
            name: 'Database Connection',
            status: 'FAIL',
            details: `Database query failed: ${error.message}`
          }
        } else {
          dbTest = {
            name: 'Database Connection',
            status: 'PASS',
            details: 'Successfully connected to Supabase'
          }
        }
      }
    } catch (error: any) {
      dbTest = {
        name: 'Database Connection',
        status: 'FAIL',
        details: `Database connection error: ${error.message}`
      }
    }
    tests.push(dbTest)

    // Test 4: OAuth Endpoint Accessibility
    let oauthTest = { name: 'OAuth Endpoint', status: 'UNKNOWN', details: 'Test not run' }
    try {
      const oauthUrl = `${baseUrl}/api/auth/twitter/direct-login`
      const response = await fetch(oauthUrl, { 
        method: 'HEAD',
        redirect: 'manual'
      })
      
      oauthTest = {
        name: 'OAuth Endpoint',
        status: response.status === 307 ? 'PASS' : 'FAIL',
        details: `OAuth endpoint returned ${response.status}. Expected 307 (redirect).`
      }
    } catch (error: any) {
      oauthTest = {
        name: 'OAuth Endpoint',
        status: 'FAIL',
        details: `Failed to reach OAuth endpoint: ${error.message}`
      }
    }
    tests.push(oauthTest)

    // Overall assessment
    const passedTests = tests.filter(t => t.status === 'PASS').length
    const failedTests = tests.filter(t => t.status === 'FAIL').length
    const warningTests = tests.filter(t => t.status === 'WARN').length

    let overallStatus = 'UNKNOWN'
    let recommendation = []

    if (failedTests === 0 && warningTests === 0) {
      overallStatus = '✅ ALL SYSTEMS GO'
      recommendation.push('OAuth should be working correctly')
    } else if (failedTests > 0) {
      overallStatus = '❌ CRITICAL ISSUES FOUND'
      recommendation.push('Fix failed tests before proceeding')
    } else {
      overallStatus = '⚠️ WARNINGS FOUND'
      recommendation.push('Address warnings for optimal performance')
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      base_url: baseUrl,
      overall_status: overallStatus,
      test_summary: {
        total: tests.length,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests
      },
      tests,
      recommendations: recommendation,
      next_steps: failedTests > 0 
        ? ['Fix environment variables in Vercel dashboard', 'Check Supabase configuration', 'Verify Twitter app settings']
        : ['Test OAuth flow manually', 'Check application logs for specific errors']
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to run OAuth callback tests',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
