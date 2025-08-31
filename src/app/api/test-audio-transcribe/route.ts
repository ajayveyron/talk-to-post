import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🎵 Testing real audio transcription with test.m4a file...')

    // Path to the test audio file
    const audioFilePath = path.join(process.cwd(), 'test.m4a')
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      return NextResponse.json({
        status: 'error',
        message: 'test.m4a file not found',
        expected_path: audioFilePath
      })
    }

    console.log('✅ Audio file found at:', audioFilePath)

    // Get file stats
    const stats = fs.statSync(audioFilePath)
    const fileSizeBytes = stats.size
    const fileSizeMB = fileSizeBytes / (1024 * 1024)

    console.log(`📁 File size: ${fileSizeMB.toFixed(2)} MB`)

    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFilePath)
    
    // Create a File object from the buffer
    const audioFile = new File([audioBuffer], 'test.m4a', {
      type: 'audio/m4a',
    })

    console.log('🎤 Starting OpenAI Whisper transcription...')

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be auto-detected by omitting this
      response_format: 'verbose_json',
      temperature: 0.0, // More deterministic
    })

    console.log('✅ Transcription completed successfully!')

    // Calculate confidence if segments are available
    let avgConfidence = null
    if (transcription.segments && transcription.segments.length > 0) {
      const totalLogProb = transcription.segments.reduce((sum, segment) => {
        return sum + (segment.avg_logprob || 0)
      }, 0)
      avgConfidence = Math.exp(totalLogProb / transcription.segments.length)
    }

    const result = {
      status: 'success',
      message: '🎉 Real audio transcription successful!',
      file_info: {
        filename: 'test.m4a',
        size_bytes: fileSizeBytes,
        size_mb: parseFloat(fileSizeMB.toFixed(2)),
        duration_seconds: transcription.duration
      },
      transcription: {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        confidence: avgConfidence,
        segments_count: transcription.segments?.length || 0
      },
      whisper_model: 'whisper-1',
      production_ready: true
    }

    console.log('📝 Transcribed text:', transcription.text)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Audio transcription test error:', error)
    
    // More detailed error handling
    let errorMessage = 'Unknown error'
    let errorType = 'general'
    
    if (error instanceof Error) {
      errorMessage = error.message
      if (error.message.includes('file size')) {
        errorType = 'file_size'
      } else if (error.message.includes('format')) {
        errorType = 'file_format'
      } else if (error.message.includes('API')) {
        errorType = 'api_error'
      }
    }

    return NextResponse.json({
      status: 'error',
      error_type: errorType,
      message: 'Audio transcription test failed',
      error: errorMessage,
      debug_info: {
        openai_api_key_present: !!process.env.OPENAI_API_KEY,
        file_path: path.join(process.cwd(), 'test.m4a'),
        cwd: process.cwd()
      }
    })
  }
}
