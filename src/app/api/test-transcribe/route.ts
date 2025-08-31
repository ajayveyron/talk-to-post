import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    // Create a simple audio buffer (this is just for testing the API connection)
    const testText = text || "Hello, this is a test of the OpenAI transcription API"
    
    // For this test, we'll just echo back since we don't have a real audio file
    // In real usage, the audio file comes from Supabase Storage
    
    // Test if OpenAI API key works
    try {
      // We can't actually transcribe without a real audio file,
      // but we can test if the API key is valid by making a different call
      const models = await openai.models.list()
      
      return NextResponse.json({
        status: 'success',
        message: 'OpenAI API connection successful',
        transcript: testText,
        confidence: 0.95,
        language: 'en',
        openai_models_count: models.data.length,
        test: true
      })
    } catch (openaiError) {
      return NextResponse.json({
        status: 'error',
        message: 'OpenAI API connection failed',
        error: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error'
      })
    }
  } catch (error) {
    console.error('Test transcription error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
