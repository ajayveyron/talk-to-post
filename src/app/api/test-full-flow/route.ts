import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json()
    const testTranscript = transcript || "Building an amazing voice to Twitter AI platform. This technology will revolutionize content creation. Users can just speak their thoughts and get polished tweets instantly."

    // Step 1: Create a test user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    })

    if (authError && !authError.message.includes('already')) {
      return NextResponse.json({
        step: 'auth',
        status: 'error',
        error: authError.message
      })
    }

    const userId = authData?.user?.id

    // Step 2: Create a recording
    const { data: recording, error: recordingError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: userId,
        storage_key: `test/${Date.now()}-recording.webm`,
        status: 'transcribing',
      })
      .select()
      .single()

    if (recordingError) {
      return NextResponse.json({
        step: 'recording',
        status: 'error',
        error: recordingError.message
      })
    }

    // Step 3: Create transcript
    const { data: transcriptData, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .insert({
        recording_id: recording.id,
        text: testTranscript,
        confidence: 0.95,
        language: 'en',
      })
      .select()
      .single()

    if (transcriptError) {
      return NextResponse.json({
        step: 'transcript',
        status: 'error',
        error: transcriptError.message
      })
    }

    // Step 4: Test OpenRouter drafting
    const draftingPrompt = `You are an editor for startup/tech Twitter.
- Remove filler, hedging, repetition.
- Output either single tweet or thread (1 idea per tweet).
- Max 280 chars per tweet.
- Keep proper nouns as-is.
- Output JSON: { "mode": "tweet"|"thread", "tweets": [{"text": "...", "char_count": 123}, ...] }.

TRANSCRIPT:
${testTranscript}`

    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'Voice-to-Twitter AI Platform',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: draftingPrompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!openrouterResponse.ok) {
      return NextResponse.json({
        step: 'openrouter',
        status: 'error',
        error: 'OpenRouter API failed'
      })
    }

    const openrouterData = await openrouterResponse.json()
    const content = openrouterData.choices[0]?.message?.content

    let draftData
    try {
      draftData = JSON.parse(content)
    } catch (e) {
      draftData = {
        mode: 'tweet',
        tweets: [{ text: content.slice(0, 280), char_count: Math.min(content.length, 280) }]
      }
    }

    // Step 5: Save draft
    const { data: draft, error: draftError } = await supabaseAdmin
      .from('drafts')
      .insert({
        recording_id: recording.id,
        mode: draftData.mode || 'tweet',
        thread: draftData.tweets || [],
        original_text: testTranscript,
      })
      .select()
      .single()

    if (draftError) {
      return NextResponse.json({
        step: 'draft',
        status: 'error',
        error: draftError.message
      })
    }

    // Step 6: Update recording status
    await supabaseAdmin
      .from('recordings')
      .update({ status: 'ready' })
      .eq('id', recording.id)

    // Step 7: Test posting (mock for now since we don't have Twitter API)
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .insert({
        recording_id: recording.id,
        draft_id: draft.id,
        twitter_tweet_ids: ['mock-tweet-123', 'mock-tweet-456'],
        posted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (postError) {
      return NextResponse.json({
        step: 'post',
        status: 'error',
        error: postError.message
      })
    }

    // Update recording to posted
    await supabaseAdmin
      .from('recordings')
      .update({ status: 'posted' })
      .eq('id', recording.id)

    return NextResponse.json({
      status: 'success',
      message: 'Full end-to-end test completed successfully!',
      flow: {
        user_id: userId,
        recording_id: recording.id,
        transcript_id: transcriptData.id,
        draft_id: draft.id,
        post_id: post.id,
        original_text: testTranscript,
        draft_mode: draft.mode,
        tweets: draft.thread,
        mock_tweet_ids: post.twitter_tweet_ids
      }
    })

  } catch (error) {
    console.error('Full flow test error:', error)
    return NextResponse.json({
      step: 'general',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
