import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig } from '@/config'

export async function POST(request: NextRequest) {
  try {
    const { text, maxLength = 280 } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // If text is already within limit, return as is
    if (text.length <= maxLength) {
      return NextResponse.json({
        rewrittenText: text,
        originalLength: text.length,
        newLength: text.length,
      })
    }

    // Use OpenRouter to rewrite the tweet
    const rewritePrompt = `Please rewrite the following text to fit within ${maxLength} characters while preserving the core message and tone. The rewrite should be engaging and suitable for Twitter.

Original text (${text.length} characters):
${text}

Please respond with ONLY the rewritten text, no additional commentary or formatting.`

    console.log('Sending rewrite request to OpenRouter:', {
      model: getAIConfig().model.name,
      originalLength: text.length,
      targetLength: maxLength,
    })

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
            content: rewritePrompt,
          },
        ],
        temperature: 0.7, // Slightly more creative for rewriting
        max_tokens: 100, // Should be enough for a tweet
        reasoning: {
          effort: "minimal"
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to rewrite tweet' },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('OpenRouter rewrite response:', JSON.stringify(data, null, 2))
    
    const rewrittenText = data.choices[0]?.message?.content?.trim()

    if (!rewrittenText) {
      console.error('No content in OpenRouter response:', data)
      // Fallback: truncate the original text
      const truncated = text.slice(0, maxLength - 3) + '...'
      return NextResponse.json({
        rewrittenText: truncated,
        originalLength: text.length,
        newLength: truncated.length,
        fallback: true,
      })
    }

    return NextResponse.json({
      rewrittenText,
      originalLength: text.length,
      newLength: rewrittenText.length,
    })
  } catch (error) {
    console.error('Tweet rewrite error:', error)
    return NextResponse.json(
      { error: 'Tweet rewrite failed' },
      { status: 500 }
    )
  }
}