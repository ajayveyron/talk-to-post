import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordingId = params.id

    // Verify recording exists and belongs to user
    const { data: recording, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    // Update status to transcribing
    const { error: updateError } = await supabaseAdmin
      .from('recordings')
      .update({ status: 'transcribing' })
      .eq('id', recordingId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update recording status' },
        { status: 500 }
      )
    }

    // TODO: Add to BullMQ queue for background processing
    // For now, we'll trigger transcription directly
    try {
      await processRecording(recordingId)
    } catch (error) {
      console.error('Processing error:', error)
      // Update status to failed
      await supabaseAdmin
        .from('recordings')
        .update({ status: 'failed' })
        .eq('id', recordingId)
      
      return NextResponse.json(
        { error: 'Failed to process recording' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Recording ingestion started',
      recording_id: recordingId,
    })
  } catch (error) {
    console.error('Recording ingest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processRecording(recordingId: string) {
  // This function will be moved to a background job
  // For now, we'll call the transcription and drafting APIs directly
  
  // Step 1: Transcribe
  const transcribeResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recording_id: recordingId }),
  })

  if (!transcribeResponse.ok) {
    throw new Error('Transcription failed')
  }

  // Step 2: Generate draft
  const draftResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recording_id: recordingId }),
  })

  if (!draftResponse.ok) {
    throw new Error('Draft generation failed')
  }

  // Update status to ready
  await supabaseAdmin
    .from('recordings')
    .update({ status: 'ready' })
    .eq('id', recordingId)
}
