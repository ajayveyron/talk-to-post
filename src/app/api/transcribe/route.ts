import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { recording_id } = await request.json()

    if (!recording_id) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      )
    }

    // Get recording details
    const { data: recording, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    // Download audio file from Supabase Storage
    const { data: audioData, error: downloadError } = await supabaseAdmin.storage
      .from('audio-recordings')
      .download(recording.storage_key)

    if (downloadError || !audioData) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download audio file' },
        { status: 500 }
      )
    }

    // Convert blob to file for OpenAI API
    const audioFile = new File([audioData], 'recording.webm', {
      type: 'audio/webm',
    })

    // Transcribe using OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Can be made dynamic
      response_format: 'verbose_json',
    })

    // Save transcript to database
    const { data: transcript, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .insert({
        recording_id: recording_id,
        text: transcription.text,
        confidence: transcription.segments ? 
          transcription.segments.reduce((acc, seg) => acc + (seg.avg_logprob || 0), 0) / transcription.segments.length : 
          null,
        language: transcription.language,
      })
      .select()
      .single()

    if (transcriptError) {
      console.error('Database error:', transcriptError)
      return NextResponse.json(
        { error: 'Failed to save transcript' },
        { status: 500 }
      )
    }

    // Update recording status
    const { error: updateError } = await supabaseAdmin
      .from('recordings')
      .update({ status: 'drafting' })
      .eq('id', recording_id)

    if (updateError) {
      console.error('Status update error:', updateError)
    }

    return NextResponse.json({
      transcript_id: transcript.id,
      text: transcription.text,
      confidence: transcript.confidence,
      language: transcription.language,
      duration: transcription.duration,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    
    // Update recording status to failed
    if (request.body) {
      const body = await request.json().catch(() => ({}))
      if (body.recording_id) {
        await supabaseAdmin
          .from('recordings')
          .update({ status: 'failed' })
          .eq('id', body.recording_id)
      }
    }

    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    )
  }
}
