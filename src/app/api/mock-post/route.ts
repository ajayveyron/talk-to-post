import { NextRequest, NextResponse } from 'next/server'

// Mock posting API for testing without Twitter API
export async function POST(request: NextRequest) {
  try {
    const { draft_id, tweets } = await request.json()
    
    if (!draft_id && !tweets) {
      return NextResponse.json(
        { error: 'Draft ID or tweets array is required' },
        { status: 400 }
      )
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate mock tweet IDs
    const mockTweetIds = tweets ? 
      tweets.map((_: any, index: number) => `mock-tweet-${Date.now()}-${index}`) :
      [`mock-tweet-${Date.now()}`]
    
    return NextResponse.json({
      post_id: `mock-post-${Date.now()}`,
      tweet_ids: mockTweetIds,
      mode: tweets && tweets.length > 1 ? 'thread' : 'tweet',
      posted_at: new Date().toISOString(),
      mock: true,
      twitter_urls: mockTweetIds.map(id => `https://twitter.com/user/status/${id}`)
    })
  } catch (error) {
    console.error('Mock post creation error:', error)
    return NextResponse.json(
      { error: 'Mock posting failed' },
      { status: 500 }
    )
  }
}
