import { NextRequest, NextResponse } from 'next/server'

// Mock drafting API for testing without OpenRouter
export async function POST(request: NextRequest) {
  try {
    const { transcript, mode = 'auto' } = await request.json()
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const inputText = transcript || "Building an AI product that converts voice to Twitter posts using latest technology."
    
    // Simple logic to determine if it should be a thread
    const shouldBeThread = inputText.length > 200 || inputText.includes(',') || inputText.includes('.')
    
    let mockDraft
    
    if (shouldBeThread && mode !== 'tweet') {
      // Create a thread
      const sentences = inputText.split(/[.!?]+/).filter(s => s.trim().length > 0)
      const tweets = sentences.map(sentence => {
        const text = sentence.trim().slice(0, 280)
        return {
          text: text,
          char_count: text.length
        }
      }).filter(tweet => tweet.text.length > 0)
      
      mockDraft = {
        mode: 'thread',
        tweets: tweets.length > 1 ? tweets : [{ text: inputText.slice(0, 280), char_count: Math.min(inputText.length, 280) }]
      }
    } else {
      // Create a single tweet
      const tweetText = inputText.slice(0, 280)
      mockDraft = {
        mode: 'tweet',
        tweets: [{
          text: tweetText,
          char_count: tweetText.length
        }]
      }
    }
    
    return NextResponse.json({
      draft_id: `mock-draft-${Date.now()}`,
      mode: mockDraft.mode,
      tweets: mockDraft.tweets,
      original_text: inputText,
      mock: true
    })
  } catch (error) {
    console.error('Mock draft generation error:', error)
    return NextResponse.json(
      { error: 'Mock draft generation failed' },
      { status: 500 }
    )
  }
}
