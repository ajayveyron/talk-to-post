import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // Query posts from the last 30 days
    // We need to join with recordings to get user_id since posts table doesn't have user_id directly
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        posted_at,
        recordings!inner(user_id)
      `)
      .eq('recordings.user_id', user.id)
      .not('posted_at', 'is', null)
      .gte('posted_at', startDate.toISOString())
      .lte('posted_at', endDate.toISOString())
      .order('posted_at', { ascending: true })

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 })
    }

    // Generate activity data for the last 30 days
    const activityData = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]
      
      // Count posts for this date
      const dayPosts = posts?.filter((post: any) => {
        const postDate = new Date(post.posted_at).toISOString().split('T')[0]
        return postDate === dateString
      }) || []
      
      const count = dayPosts.length
      
      // Calculate activity level (0-4)
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (count > 0) {
        if (count === 1) level = 1
        else if (count <= 3) level = 2
        else if (count <= 5) level = 3
        else level = 4
      }
      
      activityData.push({
        date: dateString,
        count,
        level
      })
    }

    return NextResponse.json({
      activity: activityData,
      totalPosts: posts?.length || 0,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Error in activity API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}