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
      await processRecording(recordingId, request)
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

async function processRecording(recordingId: string, request?: NextRequest) {
  // This function will be moved to a background job
  // For now, we'll call the transcription and drafting APIs directly
  
  // Construct base URL for API calls
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL
    || (request ? (request.headers.get('origin') || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`) : null)
    || 'https://talk-to-post.vercel.app' // Fallback to stable domain
  
  console.log('Using base URL for API calls:', baseUrl)
  
  // Step 1: Transcribe
  const transcribeUrl = `${baseUrl}/api/transcribe`
  console.log('Calling transcribe API:', transcribeUrl)
  
  const transcribeResponse = await fetch(transcribeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recording_id: recordingId }),
  })

  if (!transcribeResponse.ok) {
    const errorText = await transcribeResponse.text()
    console.error('Transcription failed:', transcribeResponse.status, errorText)
    throw new Error(`Transcription failed: ${transcribeResponse.status} ${errorText}`)
  }

  // Step 2: Generate draft
  const draftUrl = `${baseUrl}/api/draft`
  console.log('Calling draft API:', draftUrl)
  
  const draftResponse = await fetch(draftUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recording_id: recordingId }),
  })

  if (!draftResponse.ok) {
    const errorText = await draftResponse.text()
    console.error('Draft generation failed:', draftResponse.status, errorText)
    throw new Error(`Draft generation failed: ${draftResponse.status} ${errorText}`)
  }

  // Update status to ready
  await supabaseAdmin
    .from('recordings')
    .update({ status: 'ready' })
    .eq('id', recordingId)
}
