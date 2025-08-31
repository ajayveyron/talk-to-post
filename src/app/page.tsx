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
  const { user, isTwitterConnected, signInWithTwitter, loading: authLoading } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [editedTweets, setEditedTweets] = useState<{ text: string; char_count: number }[]>([])
  const [testResults, setTestResults] = useState<any>(null)
  const [testing, setTesting] = useState(false)
  const [twitterConnected, setTwitterConnected] = useState(false)

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

  // Listen for auth state changes and update Twitter connection status
  useEffect(() => {
    if (!user) {
      // User signed out - clear Twitter connection
      setTwitterConnected(false)
      localStorage.removeItem('twitter_connected')
      localStorage.removeItem('twitter_username')
    }
  }, [user])

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
      setError('Failed to access microphone')
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

  const handleTestTwitter = async () => {
    if (!twitterConnected) {
      setError('Please connect your Twitter account first')
      return
    }

    try {
      setTesting(true)
      setTestResults(null)
      setError(null)
      
      const response = await fetch('/api/test-twitter-posting', {
        method: 'POST',
      })
      
      const result = await response.json()
      setTestResults(result)
      
      if (!result.success) {
        setError(`Test failed at step: ${result.step}. ${result.error}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setTesting(false)
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
                          <>
                            <Button
                              variant="outlined"
                              color="info"
                              onClick={handleTestTwitter}
                              disabled={loading || testing}
                              size="small"
                            >
                              {testing ? 'Testing...' : 'Test Twitter'}
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={handleDisconnect}
                              disabled={loading}
                              size="small"
                            >
                              {loading ? 'Disconnecting...' : 'Disconnect'}
                            </Button>
                          </>
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

        {/* Setup Instructions for New Users */}
        {!authLoading && !user && (
          <Alert severity="info" sx={{ mb: 2, maxWidth: '600px', mx: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              🚀 First Time Setup Required
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              To use Twitter authentication, you need to configure it in Supabase:
            </Typography>
            <Typography variant="body2" component="div" sx={{ fontSize: '0.875rem' }}>
              1. Go to <a href="https://supabase.com/dashboard" target="_blank" style={{ color: '#1976d2' }}>Supabase Dashboard</a><br/>
              2. Select your project (zobztnjzwsgtyjhceysw)<br/>
              3. Go to Authentication → Providers<br/>
              4. Enable Twitter provider<br/>
              5. Add your Twitter app credentials<br/>
              <br/>
              <strong>Debug:</strong> Click the debug button below to test OAuth setup
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                              <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    try {
                      console.log('🔍 Testing Twitter OAuth configuration...')
                      const response = await fetch('/api/test-twitter-oauth')
                      const data = await response.json()

                      if (data.success) {
                        setError(`✅ SUCCESS! Twitter OAuth is properly configured!\n\n${data.next_steps.join('\n')}`)
                      } else {
                        setError(`❌ Twitter OAuth Issue: ${data.error}\n\n${data.possible_causes ? 'Possible causes:\n' + data.possible_causes.join('\n') : 'Check your .env.local file and Twitter Developer Portal'}`)
                      }
                    } catch (err) {
                      setError(`❌ Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                    }
                  }}
                >
                  Test Twitter OAuth
                </Button>
            </Box>
          </Alert>
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

        {testResults && (
          <Alert 
            severity={testResults.success ? "success" : "error"} 
            sx={{ mb: 2 }} 
            onClose={() => setTestResults(null)}
          >
            <Typography variant="subtitle2">
              {testResults.success ? '✅ Twitter Test Passed!' : '❌ Twitter Test Failed'}
            </Typography>
            {testResults.success ? (
              <Typography variant="body2">
                All Twitter integration tests passed successfully. You can now post drafts to Twitter.
              </Typography>
            ) : (
              <Box>
                <Typography variant="body2">
                  {testResults.error}
                </Typography>
                {testResults.recommendation && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                    💡 {testResults.recommendation}
                  </Typography>
                )}
              </Box>
            )}
          </Alert>
        )}

        {/* Recording Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Fab
            color={isRecording ? "secondary" : "primary"}
            size="large"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
          >
            {isRecording ? <MicOff /> : <Mic />}
          </Fab>
        </Box>

        <Typography variant="body2" align="center" color="text.secondary" paragraph>
          {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Recordings List */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Your Recordings</Typography>
            <IconButton onClick={fetchRecordings}>
              <Refresh />
            </IconButton>
          </Box>

          {recordings.map((recording) => (
            <Card key={recording.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {new Date(recording.created_at).toLocaleString()}
                  </Typography>
                  <Chip
                    label={recording.status}
                    color={getStatusColor(recording.status)}
                    size="small"
                  />
                </Box>

                {recording.transcripts && recording.transcripts[0] && (
                  <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                    "{recording.transcripts[0].text.slice(0, 150)}..."
                  </Typography>
                )}

                {recording.drafts && recording.drafts[0] && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      AI Draft ({recording.drafts[0].mode}):
                    </Typography>
                    {recording.drafts[0].thread.map((tweet, index) => (
                      <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2">{tweet.text}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tweet.char_count}/280 characters
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
            <Typography variant="body2" color="text.secondary" align="center">
              No recordings yet. Start by recording your first voice note!
            </Typography>
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