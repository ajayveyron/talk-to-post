import { NextRequest, NextResponse } from 'next/server'

// Mock transcription API for testing without OpenAI
export async function POST(request: NextRequest) {
  try {
    const { text, duration = 10 } = await request.json()
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const mockTranscript = text || "This is a mock transcription of the audio recording. The user talked about building an awesome AI product that will revolutionize how people create Twitter content from voice recordings."
    
    return NextResponse.json({
      transcript_id: `mock-${Date.now()}`,
      text: mockTranscript,
      confidence: 0.95,
      language: 'en',
      duration: duration,
      mock: true
    })
  } catch (error) {
    console.error('Mock transcription error:', error)
    return NextResponse.json(
      { error: 'Mock transcription failed' },
      { status: 500 }
    )
  }
}
