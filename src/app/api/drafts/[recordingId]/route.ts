import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { recordingId: string } }
) {
  try {
    const recordingId = params.recordingId

    // Get draft for this recording
    const { data: draft, error } = await supabaseAdmin
      .from('drafts')
      .select('*')
      .eq('recording_id', recordingId)
      .single()

    if (error || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      draft_id: draft.id,
      recording_id: draft.recording_id,
      mode: draft.mode,
      tweets: draft.thread,
      original_text: draft.original_text,
      created_at: draft.created_at,
      updated_at: draft.updated_at
    })
  } catch (error) {
    console.error('Draft retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
