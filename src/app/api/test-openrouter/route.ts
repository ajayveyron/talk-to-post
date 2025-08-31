import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    const testPrompt = `You are an editor for startup/tech Twitter.
- Remove filler, hedging, repetition.
- Output either single tweet or thread (1 idea per tweet).
- Max 280 chars per tweet.
- Keep proper nouns as-is.
- Output JSON: { "mode": "tweet"|"thread", "tweets": [{"text": "...", "char_count": 123}, ...] }.

TRANSCRIPT:
${text || "Testing the OpenRouter API connection for our voice to Twitter AI platform. This is really exciting technology."}`

    console.log('Testing OpenRouter with API key:', process.env.OPENROUTER_API_KEY ? 'Key present' : 'Key missing')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'Voice-to-Twitter AI Platform Test',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: testPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json({
        status: 'error',
        message: 'OpenRouter API failed',
        status_code: response.status,
        error: errorData,
        api_key_present: !!process.env.OPENROUTER_API_KEY
      })
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({
        status: 'error',
        message: 'No content generated',
        response_data: data
      })
    }

    // Try to parse JSON response
    let parsedContent
    try {
      parsedContent = JSON.parse(content)
    } catch (e) {
      parsedContent = { 
        mode: 'tweet', 
        tweets: [{ text: content.slice(0, 280), char_count: Math.min(content.length, 280) }]
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'OpenRouter API connection successful',
      original_text: text,
      draft: parsedContent,
      raw_response: content
    })
  } catch (error) {
    console.error('OpenRouter test error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
