import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSystemPrompt, getAIConfig } from '@/config'

export async function POST(request: NextRequest) {
  try {
    const { recording_id } = await request.json()

    if (!recording_id) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    // Get the transcript for this recording
    const { data: transcript, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('recording_id', recording_id)
      .single()

    if (transcriptError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    // Use OpenRouter to refine the transcript
    const systemPrompt = getSystemPrompt()
    const draftingPrompt = `${systemPrompt}

TRANSCRIPT:
${transcript.text}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'Voice-to-Twitter AI Platform',
      },
      body: JSON.stringify({
        model: getAIConfig().model.name,
        messages: [
          {
            role: 'user',
            content: draftingPrompt,
          },
        ],
        temperature: getAIConfig().model.temperature,
        max_tokens: getAIConfig().model.maxTokens,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate draft' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No content generated' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    let draftData
    try {
      draftData = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      // Fallback: create a simple tweet from the content
      draftData = {
        mode: 'tweet',
        tweets: [{ text: content.slice(0, 280), char_count: Math.min(content.length, 280) }]
      }
    }

    // Validate and ensure character counts
    if (draftData.tweets) {
      draftData.tweets = draftData.tweets.map((tweet: any) => ({
        text: tweet.text || tweet,
        char_count: (tweet.text || tweet).length,
      }))
    }

    // Save draft to database
    const { data: draft, error: draftError } = await supabaseAdmin!
      .from('drafts')
      .insert({
        recording_id: recording_id,
        mode: draftData.mode || 'tweet',
        thread: draftData.tweets || [{ text: content.slice(0, 280), char_count: Math.min(content.length, 280) }],
        original_text: transcript.text,
      })
      .select()
      .single()

    if (draftError) {
      console.error('Database error:', draftError)
      return NextResponse.json(
        { error: 'Failed to save draft' },
        { status: 500 }
      )
    }

    // Update recording status to ready
    const { error: updateError } = await supabaseAdmin!
      .from('recordings')
      .update({ status: 'ready' })
      .eq('id', recording_id)

    if (updateError) {
      console.error('Status update error:', updateError)
    }

    return NextResponse.json({
      draft_id: draft.id,
      mode: draft.mode,
      tweets: draft.thread,
      original_text: transcript.text,
    })
  } catch (error) {
    console.error('Draft generation error:', error)
    
    // Update recording status to failed
    const body = await request.json().catch(() => ({}))
    if (body.recording_id && supabaseAdmin) {
      await supabaseAdmin
        .from('recordings')
        .update({ status: 'failed' })
        .eq('id', body.recording_id)
    }

    return NextResponse.json(
      { error: 'Draft generation failed' },
      { status: 500 }
    )
  }
}
