import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const draftId = formData.get('draftId') as string

    if (!file || !draftId) {
      return NextResponse.json(
        { error: 'File and draft ID are required' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please use JPG, PNG, GIF, WEBP, MP4, or MOV files.' },
        { status: 400 }
      )
    }

    // Check file size limits based on type
    const maxImageSize = 5 * 1024 * 1024 // 5MB for images
    const maxVideoSize = 512 * 1024 * 1024 // 512MB for videos
    const maxSize = file.type.startsWith('video/') ? maxVideoSize : maxImageSize

    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith('video/') ? 512 : 5
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeMB}MB for ${file.type.startsWith('video/') ? 'videos' : 'images'}.` },
        { status: 400 }
      )
    }

    // Get user ID from draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('drafts')
      .select(`
        *,
        recordings (
          user_id
        )
      `)
      .eq('id', draftId)
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    const userId = draft.recordings?.user_id
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('attachments')
      .upload(uniqueFilename, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Determine media type
    let mediaType = 'image'
    if (file.type.startsWith('video/')) {
      mediaType = 'video'
    } else if (file.type === 'image/gif') {
      mediaType = 'gif'
    }

    // Save attachment record to database
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('attachments')
      .insert({
        user_id: userId,
        draft_id: draftId,
        storage_key: uploadData.path,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        media_type: mediaType
      })
      .select()
      .single()

    if (attachmentError) {
      console.error('Database error:', attachmentError)
      // Clean up uploaded file
      await supabaseAdmin.storage
        .from('attachments')
        .remove([uploadData.path])
      
      return NextResponse.json(
        { error: 'Failed to save attachment record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: attachment.id,
      filename: attachment.filename,
      file_size: attachment.file_size,
      mime_type: attachment.mime_type,
      media_type: attachment.media_type,
      storage_key: attachment.storage_key
    })
  } catch (error) {
    console.error('Attachment upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 }
      )
    }

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('attachments')
      .remove([attachment.storage_key])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) {
      console.error('Database deletion error:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attachment deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}
