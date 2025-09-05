import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attachmentId = params.id

    if (!attachmentId) {
      return new NextResponse('Attachment ID is required', { status: 400 })
    }

    if (!supabaseAdmin) {
      return new NextResponse('Database connection error', { status: 500 })
    }

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (attachmentError || !attachment) {
      console.error('Attachment not found:', attachmentError)
      return new NextResponse('Attachment not found', { status: 404 })
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from('attachments')
      .download(attachment.storage_key)

    if (fileError || !fileData) {
      console.error('File not found in storage:', fileError)
      return new NextResponse('File not found', { status: 404 })
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Disposition': `inline; filename="${attachment.filename}"`,
      },
    })
  } catch (error) {
    console.error('Attachment preview error:', error)
    return new NextResponse('Failed to load attachment preview', { status: 500 })
  }
}
