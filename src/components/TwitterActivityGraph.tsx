'use client'

import React, { useState, useEffect } from 'react'
import { Box, Typography, Tooltip, Card, CardContent, CircularProgress, Alert } from '@mui/material'

interface ActivityData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4 // 0 = no activity, 4 = highest activity
}

interface TwitterActivityGraphProps {
  userId?: string
  className?: string
}

const TwitterActivityGraph: React.FC<TwitterActivityGraphProps> = ({ userId, className }) => {
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  // Generate last 30 days of data
  const generateLast30Days = (): string[] => {
    const days: string[] = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split('T')[0])
    }
    
    return days
  }

  // Fetch Twitter activity data
  const fetchActivityData = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, we'll simulate data since we need to implement the actual API
      // In a real implementation, this would call your backend API
      const response = await fetch('/api/twitter/activity', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch activity data')
      }

      const data = await response.json()
      setActivityData(data.activity || [])
    } catch (err) {
      console.error('Error fetching activity data:', err)
      // For demo purposes, generate some sample data
      generateSampleData()
    } finally {
      setLoading(false)
    }
  }

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const last30Days = generateLast30Days()
    const sampleData: ActivityData[] = last30Days.map(date => {
      // Random activity for demo
      const count = Math.floor(Math.random() * 5)
      const level = Math.min(4, Math.floor(count / 1.5)) as 0 | 1 | 2 | 3 | 4
      
      return {
        date,
        count,
        level
      }
    })
    
    setActivityData(sampleData)
  }

  useEffect(() => {
    fetchActivityData()
  }, [userId])

  // Get activity level color
  const getActivityColor = (level: number): string => {
    const colors = {
      0: '#ebedf0', // No activity
      1: '#c6e48b', // Low activity
      2: '#7bc96f', // Medium activity
      3: '#239a3b', // High activity
      4: '#196127'  // Very high activity
    }
    return colors[level as keyof typeof colors] || colors[0]
  }

  // Get activity level color for blue theme (GitHub-style blue colors)
  const getBlueActivityColor = (level: number): string => {
    const colors = {
      0: '#ebedf0', // No activity - light gray
      1: '#c6e48b', // Low activity - very light blue-green
      2: '#7bc96f', // Medium activity - light blue-green
      3: '#239a3b', // High activity - medium blue-green
      4: '#196127'  // Very high activity - dark blue-green
    }
    return colors[level as keyof typeof colors] || colors[0]
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get day of week
  const getDayOfWeek = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // Calculate total posts
  const totalPosts = activityData.reduce((sum: number, day: ActivityData) => sum + day.count, 0)

  // Calculate current streak
  const getCurrentStreak = (): number => {
    let streak = 0
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().split('T')[0]
      
      const dayData = activityData.find((d: ActivityData) => d.date === dateString)
      if (dayData && dayData.count > 0) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }

  if (loading) {
    return (
      <Card className={className} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className} sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Card>
    )
  }

  return (
    <Card className={className} sx={{ 
      p: 3,
      border: '1px solid #d0d7de',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
      boxShadow: 'none'
    }}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Twitter Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalPosts} posts in the last 30 days
            {getCurrentStreak() > 0 && (
              <span> • {getCurrentStreak()} day streak</span>
            )}
          </Typography>
        </Box>

        {/* Month labels */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          mb: 1,
          ml: '28px' // Align with grid
        }}>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
            <Box key={month} sx={{ 
              fontSize: '10px',
              color: 'text.secondary',
              minWidth: '12px',
              textAlign: 'center'
            }}>
              {month}
            </Box>
          ))}
        </Box>

        {/* Activity Grid */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          mb: 2,
          overflow: 'hidden'
        }}>
          {/* Day labels */}
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            minWidth: '20px',
            pt: '12px' // Align with grid
          }}>
            {['Mon', 'Wed', 'Fri'].map(day => (
              <Box key={day} sx={{ 
                height: '12px', 
                display: 'flex', 
                alignItems: 'center',
                fontSize: '10px',
                color: 'text.secondary',
                justifyContent: 'flex-end'
              }}>
                {day}
              </Box>
            ))}
          </Box>

          {/* Activity squares */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '3px',
            flex: 1
          }}>
            {activityData.map((day: ActivityData, index: number) => {
              const isHovered = hoveredDay === day.date
              const dayOfWeek = new Date(day.date).getDay()
              
              return (
                <Tooltip
                  key={day.date}
                  title={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {day.count === 0 ? 'No posts' : `${day.count} post${day.count > 1 ? 's' : ''}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(day.date)}
                      </Typography>
                    </Box>
                  }
                  placement="top"
                  arrow
                >
                  <Box
                    sx={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: getBlueActivityColor(day.level),
                      borderRadius: '2px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: isHovered ? '1px solid #000' : '1px solid transparent',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      '&:hover': {
                        border: '1px solid #000',
                        transform: 'scale(1.1)'
                      }
                    }}
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                </Tooltip>
              )
            })}
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mt: 2
        }}>
          <Typography variant="caption" color="text.secondary">
            Less
          </Typography>
          <Box sx={{ display: 'flex', gap: '3px' }}>
            {[0, 1, 2, 3, 4].map(level => (
              <Box
                key={level}
                sx={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: getBlueActivityColor(level),
                  borderRadius: '2px',
                  border: '1px solid transparent'
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            More
          </Typography>
        </Box>

        {/* Stats */}
        <Box sx={{ 
          display: 'flex', 
          gap: 4, 
          mt: 3, 
          pt: 2, 
          borderTop: '1px solid #e1e8ed'
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {totalPosts}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total posts
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {getCurrentStreak()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Day streak
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {Math.round((activityData.filter((d: ActivityData) => d.count > 0).length / 30) * 100)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active days
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default TwitterActivityGraph