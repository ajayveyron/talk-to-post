'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Fab,
  Alert,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import {
  Mic,
  MicOff,
  Send,
  Twitter,
  PlayArrow,
  Stop,
  Edit,
  Delete,
  Refresh,
  CheckCircle,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'

interface Recording {
  id: string
  status: string
  created_at: string
  transcripts?: { text: string }[]
  drafts?: Draft[]
  posts?: { twitter_tweet_ids: string[], posted_at: string }[]
}

interface Draft {
  id: string
  mode: 'tweet' | 'thread'
  thread: { text: string; char_count: number }[]
  original_text?: string
}

export default function Home() {
  const { user, isTwitterConnected, signInWithTwitter, signOut, loading: authLoading } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [editedTweets, setEditedTweets] = useState<{ text: string; char_count: number }[]>([])
  const [twitterConnected, setTwitterConnected] = useState(false)
  const [spacebarPressed, setSpacebarPressed] = useState(false)
  const [micPressed, setMicPressed] = useState(false)
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [requestingPermission, setRequestingPermission] = useState(false)

    useEffect(() => {
    fetchRecordings()
    checkTwitterConnection()

    // Check for auth success/error from URL params
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'success') {
      // Check if Twitter connection info is in URL
      const twitterUserId = urlParams.get('twitter_user_id')
      const twitterUsername = urlParams.get('twitter_username')
      if (twitterUserId && twitterUsername) {
        setTwitterConnected(true)
        localStorage.setItem('twitter_connected', 'true')
        localStorage.setItem('twitter_username', twitterUsername)
        setError(`✅ Twitter connected successfully! Welcome @${twitterUsername}`)
      } else {
        setError('✅ Authentication successful!')
      }
      // Remove the URL parameters after a delay
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname)
        setError(null)
      }, 5000)
    } else if (urlParams.get('error')) {
      const errorType = urlParams.get('error')
      let errorMessage = 'Authentication failed'

      switch (errorType) {
        case 'auth_failed':
          errorMessage = 'Twitter authentication failed - please try again'
          break
        case 'oauth_error':
          errorMessage = `Twitter OAuth error: ${urlParams.get('details') || 'Unknown'}`
          break
        default:
          errorMessage = `Authentication failed: ${errorType}`
      }

      setError(errorMessage)
      // Remove the error parameter
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Check microphone permission status and request if needed
  const checkAndRequestMicrophonePermission = async () => {
    try {
      if (typeof window === 'undefined') {
        return
      }

      // Check if getUserMedia is available
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isHTTPS = window.location.protocol === 'https:'
        if (!isHTTPS && window.location.hostname !== 'localhost') {
          setError('Microphone access requires HTTPS. Please use the secure version of this site.')
          setHasPermission(false)
          return
        }
        setError('Microphone access is not supported in this browser. Try using Chrome, Firefox, or Safari.')
        setHasPermission(false)
        return
      }

      // Try to check permission status first
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          
          if (permission.state === 'granted') {
            setHasPermission(true)
            return
          } else if (permission.state === 'denied') {
            setHasPermission(false)
            setError('Microphone access was denied. Please enable it in your browser settings and refresh the page.')
            return
          }
          // If state is 'prompt', we'll request permission below
        } catch (e) {
          console.log('Permission query not supported, will request directly')
        }
      }

      // Request permission proactively
      console.log('Requesting microphone permission on page load...')
      await requestMicrophonePermission()
      
    } catch (error) {
      console.log('Permission check failed:', error)
      setHasPermission(null) // Will try again when user attempts to record
    }
  }

  // Check and request permission on mount
  useEffect(() => {
    // Small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      checkAndRequestMicrophonePermission()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  // Listen for auth state changes and update Twitter connection status
  useEffect(() => {
    if (!user) {
      // User signed out - clear Twitter connection
      setTwitterConnected(false)
      localStorage.removeItem('twitter_connected')
      localStorage.removeItem('twitter_username')
    }
  }, [user])

  // Spacebar recording functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if spacebar is pressed, not in an input field, and not already pressed
      if (event.code === 'Space' && 
          !spacebarPressed && 
          !isRecording &&
          event.target instanceof Element &&
          !['input', 'textarea', 'select'].includes(event.target.tagName.toLowerCase()) &&
          !event.target.closest('[contenteditable]')) {
        
        event.preventDefault()
        setSpacebarPressed(true)
        startRecording()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && spacebarPressed) {
        event.preventDefault()
        setSpacebarPressed(false)
        if (isRecording) {
          stopRecording()
        }
      }
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [spacebarPressed, isRecording]) // Dependencies to ensure fresh state

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimer) {
        clearTimeout(holdTimer)
      }
    }
  }, [holdTimer])

  // Mic press-and-hold handlers
  const handleMicPressStart = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    if (loading) return

    console.log('Mic press start')
    setMicPressed(true)
    
    // Set a timer for hold detection (300ms - shorter for better UX)
    const timer = setTimeout(() => {
      console.log('Hold detected - starting recording')
      // This is a hold - start recording if not already recording
      if (!isRecording) {
        startRecording()
      }
    }, 300)
    
    setHoldTimer(timer)
  }

  const handleMicPressEnd = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault()
    console.log('Mic press end', { micPressed, isRecording, holdTimer: !!holdTimer })
    
    // Check if this was a quick tap (timer still active)
    const wasQuickTap = !!holdTimer
    
    // Clear the hold timer
    if (holdTimer) {
      clearTimeout(holdTimer)
      setHoldTimer(null)
      
      // If it was a quick tap and we're not recording, start recording
      if (wasQuickTap && !isRecording) {
        console.log('Quick tap detected - starting recording')
        startRecording()
      }
    }

    // If we were in hold mode and recording, stop recording
    if (micPressed && isRecording && !wasQuickTap) {
      console.log('Hold release - stopping recording')
      stopRecording()
    }
    
    setMicPressed(false)
  }

  const handleMicClick = (event: React.MouseEvent) => {
    // This is a fallback for click events that don't go through press/release
    console.log('Mic click fallback')
    
    // Toggle recording
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const checkTwitterConnection = async () => {
    // Check localStorage for Twitter connection status first
    const localConnected = localStorage.getItem('twitter_connected') === 'true'
    const username = localStorage.getItem('twitter_username')
    
    if (localConnected && username) {
      setTwitterConnected(true)
    } else {
      setTwitterConnected(false)
    }

    // Also check server-side Twitter status for accuracy
    try {
      const response = await fetch('/api/check-twitter-status')
      const data = await response.json()
      
      if (data.success && data.summary.has_usable_account) {
        setTwitterConnected(true)
        // Update localStorage to match server state
        localStorage.setItem('twitter_connected', 'true')
        if (data.latest_valid_account?.screen_name) {
          localStorage.setItem('twitter_username', data.latest_valid_account.screen_name)
        }
      } else {
        // Server says no connection - clear everything
        setTwitterConnected(false)
        localStorage.removeItem('twitter_connected')
        localStorage.removeItem('twitter_username')
      }
    } catch (error) {
      console.error('Failed to check Twitter status:', error)
      // If server check fails and localStorage says not connected, assume disconnected
      if (!localConnected) {
        setTwitterConnected(false)
      }
    }
  }



  const fetchRecordings = async () => {
    try {
      const response = await fetch('/api/recordings')
      if (response.ok) {
        const data = await response.json()
        setRecordings(data.recordings || [])
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error)
    }
  }

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      setRequestingPermission(true)
      setError(null)

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Recording is not available on server-side')
      }

      // Check if getUserMedia is available
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isHTTPS = window.location.protocol === 'https:'
        if (!isHTTPS && window.location.hostname !== 'localhost') {
          throw new Error('Microphone access requires HTTPS. Please use the secure version of this site.')
        }
        throw new Error('Microphone access is not supported in this browser. Try using Chrome, Firefox, or Safari.')
      }

      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately - we just wanted permission
      stream.getTracks().forEach(track => track.stop())
      
      setHasPermission(true)
      setError(null)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(`Permission denied: ${errorMessage}`)
      setHasPermission(false)
      console.error('Permission error:', err)
      return false
    } finally {
      setRequestingPermission(false)
    }
  }

  const startRecording = async () => {
    try {
      // Check if we have permission first
      if (hasPermission === false) {
        setError('Microphone permission is required. Please click "Allow Microphone" first.')
        return
      }

      if (hasPermission === null) {
        // Try to get permission
        const granted = await requestMicrophonePermission()
        if (!granted) return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('Audio recording is not supported in this browser')
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setError(null)

      recorder.addEventListener('dataavailable', async (event) => {
        if (event.data.size > 0) {
          await uploadRecording(event.data)
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
      setError(`Recording failed: ${errorMessage}`)
      console.error('Recording error:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setMediaRecorder(null)
      setIsRecording(false)
    }
  }

  const uploadRecording = async (audioBlob: Blob) => {
    try {
      setLoading(true)
      
      // Create recording
      const createResponse = await fetch('/api/recordings', {
        method: 'POST',
      })
      
      if (!createResponse.ok) {
        throw new Error('Failed to create recording')
      }
      
      const { recording_id, upload_url } = await createResponse.json()
      
      // Upload audio file
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: audioBlob,
        headers: {
          'Content-Type': 'audio/webm',
        },
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio')
      }
      
      // Trigger processing
      const ingestResponse = await fetch(`/api/recordings/${recording_id}/ingest`, {
        method: 'POST',
      })
      
      if (!ingestResponse.ok) {
        throw new Error('Failed to start processing')
      }
      
      // Refresh recordings list
      fetchRecordings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEditDraft = (draft: Draft) => {
    setEditingDraft(draft)
    setEditedTweets([...draft.thread])
  }

  const handleUpdateTweet = (index: number, text: string) => {
    const updated = [...editedTweets]
    updated[index] = { text, char_count: text.length }
    setEditedTweets(updated)
  }

  const handleTwitterLogin = async () => {
    console.log('Twitter login button clicked - starting direct OAuth flow')

    try {
      await signInWithTwitter()
    } catch (err) {
      console.error('Twitter login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Twitter login failed'
      setError(`Authentication failed: ${errorMessage}`)
    }
  }

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      console.log('Disconnecting from Twitter...')
      
      // Sign out from Supabase
      await signOut()
      
      // Clear Twitter connection state
      setTwitterConnected(false)
      localStorage.removeItem('twitter_connected')
      localStorage.removeItem('twitter_username')
      
      // Clear any error messages
      setError(null)
      
      console.log('Successfully disconnected from Twitter')
    } catch (err) {
      console.error('Disconnect error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect'
      setError(`Disconnect failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    // TODO: Implement draft update API
    setEditingDraft(null)
  }

  const handlePostDraft = async (draftId: string) => {
    if (!twitterConnected) {
      setError('Please connect your Twitter account first')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draft_id: draftId }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        // Handle specific error cases
        if (result.needsReconnect || response.status === 401) {
          setError(result.error || 'Twitter authentication expired. Please reconnect your Twitter account.')
        } else {
          setError(result.error || result.details || 'Failed to post to Twitter')
        }
        return
      }
      
      console.log('Posted successfully:', result)
      setError(null)
      
      // Refresh recordings
      fetchRecordings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Posting failed')
    } finally {
      setLoading(false)
    }
  }



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'default'
      case 'transcribing': return 'info'
      case 'drafting': return 'warning'
      case 'ready': return 'success'
      case 'posted': return 'primary'
      case 'failed': return 'error'
      default: return 'default'
    }
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Voice to Twitter
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          Record your thoughts, get AI-refined tweets
        </Typography>

                        {/* User Status */}
                {!authLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    {user || twitterConnected ? (
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Chip
                          icon={<CheckCircle />}
                          label={twitterConnected ? "Twitter Connected" : "User Signed In"}
                          color={twitterConnected ? "success" : "info"}
                          variant="outlined"
                        />
                        {twitterConnected && (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDisconnect}
                            disabled={loading}
                            size="small"
                          >
                            {loading ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Chip
                          label="Please Sign In"
                          color="warning"
                          variant="outlined"
                        />
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleTwitterLogin}
                          startIcon={<Twitter />}
                          size="small"
                          disabled={authLoading}
                        >
                          Sign in with Twitter
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}



        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, whiteSpace: 'pre-line' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}



        {/* Recording Controls */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          mb: 6,
          p: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: 1
        }}>
          {/* Permission Request Button - only show if explicitly denied */}
          {hasPermission === false && (
            <Button
              variant="contained"
              color="warning"
              onClick={requestMicrophonePermission}
              disabled={requestingPermission}
              sx={{ mb: 2 }}
              startIcon={<Mic />}
            >
              {requestingPermission ? 'Requesting Access...' : 'Enable Microphone'}
            </Button>
          )}

          {/* Recording Button - show when permission is granted or being checked */}
          {(hasPermission === true || hasPermission === null) && (
            <Fab
              color={isRecording ? "secondary" : "primary"}
              size="large"
              onMouseDown={handleMicPressStart}
              onMouseUp={handleMicPressEnd}
              onMouseLeave={handleMicPressEnd}
              onTouchStart={handleMicPressStart}
              onTouchEnd={handleMicPressEnd}
              onTouchCancel={handleMicPressEnd}
              disabled={loading || hasPermission === null}
              sx={{ 
                mb: 2,
                transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s ease-in-out',
                boxShadow: isRecording ? 4 : 2,
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                cursor: 'pointer',
                minHeight: '64px',
                minWidth: '64px',
                touchAction: 'manipulation',
                opacity: hasPermission === null ? 0.5 : 1
              }}
            >
              {isRecording ? <MicOff /> : <Mic />}
            </Fab>
          )}

          {/* Stop Button - always visible when recording */}
          {isRecording && (
            <Button
              variant="contained"
              color="secondary"
              onClick={stopRecording}
              sx={{ mb: 2 }}
              startIcon={<MicOff />}
            >
              Stop Recording
            </Button>
          )}

          <Typography 
            variant="body1" 
            align="center" 
            color={isRecording ? "secondary.main" : "text.secondary"}
            sx={{ mb: 1, fontWeight: isRecording ? 600 : 400 }}
          >
            {hasPermission === false ? '🔒 Please enable microphone access above' :
             hasPermission === null ? '🎤 Setting up microphone...' :
             isRecording ? '🔴 Recording... Click stop or release mic' : 
             '🎤 Ready to record - tap or hold'}
          </Typography>
          
          {hasPermission === true && !isRecording && (
            <Typography 
              variant="body2" 
              align="center" 
              color="text.secondary"
              sx={{ 
                opacity: 0.7,
                fontStyle: 'italic'
              }}
            >
              💡 Desktop: Hold <kbd style={{
                background: '#f5f5f5', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontSize: '0.85em',
                fontFamily: 'monospace'
              }}>SPACEBAR</kbd> • Mobile: Tap or hold mic button
            </Typography>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Recordings List */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            p: 2,
            borderRadius: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              📚 Your Recordings ({recordings.length})
            </Typography>
            <IconButton 
              onClick={fetchRecordings} 
              disabled={loading}
              sx={{ color: 'primary.contrastText' }}
            >
              <Refresh />
            </IconButton>
          </Box>

          {recordings.map((recording) => (
            <Card 
              key={recording.id} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                boxShadow: 2,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📅 {new Date(recording.created_at).toLocaleString()}
                  </Typography>
                  <Chip
                    label={recording.status.toUpperCase()}
                    color={getStatusColor(recording.status)}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                {recording.transcripts && recording.transcripts[0] && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, borderLeft: 3, borderColor: 'info.main' }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontWeight: 600, color: 'info.main' }}>
                      🎙️ TRANSCRIPT
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{recording.transcripts[0].text.slice(0, 200)}{recording.transcripts[0].text.length > 200 ? '...' : ''}"
                    </Typography>
                  </Box>
                )}

                {recording.drafts && recording.drafts[0] && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                      🤖 AI Draft ({recording.drafts[0].mode.toUpperCase()})
                    </Typography>
                    {recording.drafts[0].thread.map((tweet, index) => (
                      <Box key={index} sx={{ 
                        mb: 2, 
                        p: 2, 
                        bgcolor: 'primary.50', 
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'primary.200',
                        position: 'relative'
                      }}>
                        {recording.drafts && recording.drafts[0] && recording.drafts[0].thread.length > 1 && (
                          <Chip 
                            label={`${index + 1}/${recording.drafts[0].thread.length}`}
                            size="small"
                            sx={{ position: 'absolute', top: 8, right: 8, fontSize: '0.7rem' }}
                          />
                        )}
                        <Typography variant="body2" sx={{ pr: (recording.drafts && recording.drafts[0] && recording.drafts[0].thread.length > 1) ? 6 : 0, lineHeight: 1.5 }}>
                          {tweet.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          📊 {tweet.char_count}/280 characters
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {recording.posts && recording.posts[0] && (
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      icon={<Twitter />}
                      label={`Posted ${recording.posts[0].twitter_tweet_ids?.length || 0} tweet(s)`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
              </CardContent>

              <CardActions>
                {recording.status === 'ready' && recording.drafts && recording.drafts[0] && (
                  <>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditDraft(recording.drafts![0])}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Send />}
                      variant="contained"
                      onClick={() => handlePostDraft(recording.drafts![0].id)}
                      disabled={loading}
                    >
                      Post to Twitter
                    </Button>
                  </>
                )}
              </CardActions>
            </Card>
          ))}

          {recordings.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 6, 
              px: 3,
              borderRadius: 2,
              bgcolor: 'grey.50',
              border: 2,
              borderStyle: 'dashed',
              borderColor: 'grey.300'
            }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                🎤 No recordings yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start by recording your first voice note! <br />
                Click the microphone button or hold <strong>SPACEBAR</strong> to begin.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Edit Draft Dialog */}
      <Dialog open={!!editingDraft} onClose={() => setEditingDraft(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Draft</DialogTitle>
        <DialogContent>
          {editedTweets.map((tweet, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={`Tweet ${index + 1}`}
                value={tweet.text}
                onChange={(e) => handleUpdateTweet(index, e.target.value)}
                helperText={`${tweet.char_count}/280 characters`}
                error={tweet.char_count > 280}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDraft(null)}>Cancel</Button>
          <Button onClick={handleSaveDraft} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}