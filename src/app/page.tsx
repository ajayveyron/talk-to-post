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
  FlashOn,
  AttachFile,
  Image,
  Close,
  Add,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { validateAttachmentFile, formatFileSize } from '@/utils/fileValidation'

interface Recording {
  id: string
  status: string
  created_at: string
  transcripts?: { text: string }[]
  drafts?: Draft[]
  posts?: { twitter_tweet_ids: string[], posted_at: string }[]
}

interface Attachment {
  id: string
  filename: string
  file_size: number
  mime_type: string
  media_type: 'image' | 'video' | 'gif'
  storage_key: string
}

interface Draft {
  id: string
  mode: 'tweet' | 'thread'
  thread: { text: string; char_count: number }[]
  original_text?: string
  attachments?: Attachment[]
}

export default function Home() {
  const { user, isTwitterConnected, signInWithTwitter, signOut, loading: authLoading } = useAuth()
  const { settings } = useSettings()
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null)
  const [editedTweets, setEditedTweets] = useState<{ text: string; char_count: number }[]>([])
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set())
  const [spacebarPressed, setSpacebarPressed] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

    useEffect(() => {
    // Only fetch recordings if user is authenticated
    if (user) {
    fetchRecordings()
    }

    // Check for auth success/error from URL params
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'success') {
      // Check if Twitter connection info is in URL
      const twitterUserId = urlParams.get('twitter_user_id')
      const twitterUsername = urlParams.get('twitter_username')
      if (twitterUserId && twitterUsername) {
        setError(`✅ Twitter connected successfully! Welcome @${twitterUsername}`)
        
        // Store authentication state in localStorage as a fallback
        localStorage.setItem('twitter_authenticated', 'true')
        localStorage.setItem('twitter_user_id', twitterUserId)
        localStorage.setItem('twitter_username', twitterUsername)
      } else {
        setError('✅ Authentication successful!')
      }
      
      // The AuthContext will handle session refresh automatically
      
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
  }, [user])

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

  // Simple mic click handler - just toggle recording
  const handleMicClick = () => {
    if (loading || hasPermission !== true) return
    
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoPost: settings.autoPost }),
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

  const handleJoinTweets = async (index: number, recordingId: string, draftId: string, isEditDialog: boolean = false) => {
    const tweetsToUpdate = isEditDialog ? editedTweets : recordings.find(r => r.id === recordingId)?.drafts?.[0]?.thread || []
    
    if (index >= tweetsToUpdate.length - 1) return
    
    const firstTweet = tweetsToUpdate[index]
    const secondTweet = tweetsToUpdate[index + 1]
    const joinedText = `${firstTweet.text} ${secondTweet.text}`.trim()
    const joinedCharCount = joinedText.length
    
    let finalText = joinedText
    
    // If exceeds character limit, invoke AI to rewrite
    if (joinedCharCount > 280) {
      try {
        setLoading(true)
        const response = await fetch('/api/rewrite-tweet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: joinedText,
            maxLength: 280 
          }),
        })
        
        if (response.ok) {
          const result = await response.json()
          finalText = result.rewrittenText || joinedText
        } else {
          console.error('Failed to rewrite tweet:', await response.text())
          // Use original joined text even if it exceeds limit
        }
      } catch (error) {
        console.error('Error rewriting tweet:', error)
      } finally {
        setLoading(false)
      }
    }
    
    // Create new array with joined tweet and remove the second tweet
    const updated = [...tweetsToUpdate]
    updated[index] = { text: finalText, char_count: finalText.length }
    updated.splice(index + 1, 1) // Remove the second tweet
    
    if (isEditDialog) {
      setEditedTweets(updated)
    } else {
      // Update the recordings state directly
      setRecordings(prevRecordings => 
        prevRecordings.map(recording => {
          if (recording.id === recordingId && recording.drafts) {
            return {
              ...recording,
              drafts: recording.drafts.map(draft => 
                draft.id === draftId 
                  ? { ...draft, thread: updated }
                  : draft
              )
            }
          }
          return recording
        })
      )
    }
  }

  const toggleThreadCollapse = (recordingId: string) => {
    const newCollapsed = new Set(collapsedThreads)
    if (newCollapsed.has(recordingId)) {
      newCollapsed.delete(recordingId)
    } else {
      newCollapsed.add(recordingId)
    }
    setCollapsedThreads(newCollapsed)
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`
    return date.toLocaleDateString()
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
      
      // Sign out from Supabase (AuthContext will handle localStorage clearing)
      await signOut()
      
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

  const handleAttachmentUpload = async (file: File, draftId: string) => {
    try {
      setUploadingAttachment(true)
      setError(null)

      // Validate file
      const validation = validateAttachmentFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('draftId', draftId)

      const response = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload attachment')
      }

      console.log('Attachment uploaded successfully:', result)
      
      // Refresh recordings to show the new attachment
      fetchRecordings()
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload attachment'
      setError(`Upload failed: ${errorMessage}`)
      throw err
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/attachments?id=${attachmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete attachment')
      }

      // Refresh recordings to remove the deleted attachment
      fetchRecordings()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete attachment'
      setError(`Delete failed: ${errorMessage}`)
    }
  }

  const handlePostDraft = async (draftId: string) => {
    if (!isTwitterConnected) {
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

  // Show loading state while checking authentication
  if (authLoading) {
  return (
      <Container maxWidth="md" sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Container>
    )
  }

  // Check if user is authenticated via Supabase or localStorage fallback
  const isAuthenticated = user || (typeof window !== 'undefined' && localStorage.getItem('twitter_authenticated') === 'true')
  
  // Show sign-in UI if user is not authenticated
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        {/* Error Alert */}
        {error && (
          <Alert
            severity={error.includes('✅') ? 'success' : 'error'}
            sx={{ mb: 4, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Sign-in UI */}
        <Box sx={{ 
          textAlign: 'center', 
          py: 10,
          px: 6,
          borderRadius: 3,
          border: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 300, mb: 3, color: 'text.primary' }}>
          Voice to Twitter
        </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, maxWidth: 500, mx: 'auto', fontWeight: 400 }}>
            Record your thoughts and get AI-refined tweets. Connect with Twitter to get started.
        </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<Twitter />}
            onClick={handleTwitterLogin}
            disabled={loading}
            sx={{ 
              px: 6, 
              py: 2,
              fontSize: '1.2rem',
              backgroundColor: '#1da1f2',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: '#0d8bd9',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(29, 161, 242, 0.3)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {loading ? 'Connecting...' : 'Sign in with Twitter'}
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Error Alert */}
      {error && (
        <Alert
          severity={error.includes('✅') ? 'success' : 'error'}
          sx={{ mb: 4, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

              {/* Recording Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
        mb: 6,
        py: 6,
        px: 4,
        border: '1px solid #e0e0e0',
        borderRadius: 3,
        backgroundColor: '#fafafa',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
        {/* Permission Request Button */}
        {hasPermission === false && (
          <Button
            variant="contained"
            onClick={requestMicrophonePermission}
            disabled={requestingPermission}
          >
            {requestingPermission ? 'Requesting Access...' : 'Enable Microphone'}
          </Button>
        )}

        {/* Recording Button */}
        {(hasPermission === true || hasPermission === null) && (
          <Fab
            onClick={handleMicClick}
            disabled={loading || hasPermission === null}
            sx={{ 
              mb: 1,
              transform: isRecording ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.2s ease-in-out',
              opacity: hasPermission === null ? 0.5 : 1
            }}
          >
            {isRecording ? <MicOff /> : <Mic />}
          </Fab>
        )}

        {/* Status Text */}
        <Typography 
          variant="body1" 
          align="center" 
          color={isRecording ? "text.primary" : "text.secondary"}
          sx={{ mb: 1, fontWeight: isRecording ? 500 : 400 }}
        >
          {hasPermission === false ? 'Microphone access required' :
           hasPermission === null ? 'Setting up microphone...' :
           isRecording ? 'Recording... Press spacebar or click to stop' : 
           'Ready to record - click to start'}
        </Typography>
        
        {hasPermission === true && !isRecording && (
          <Typography 
            variant="body2" 
            align="center" 
            color="text.secondary"
            sx={{ opacity: 0.7 }}
          >
            Hold <kbd style={{
              background: '#e0e0e0', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'monospace'
            }}>SPACEBAR</kbd> to record
          </Typography>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Recordings List */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          p: 2,
          backgroundColor: '#f8f9fa',
          borderRadius: 2,
          border: '1px solid #e9ecef'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 500, color: 'text.primary' }}>
            Recordings ({recordings.length})
          </Typography>
          <IconButton 
            onClick={fetchRecordings} 
            disabled={loading}
            size="small"
            sx={{ 
              backgroundColor: 'white',
              '&:hover': { backgroundColor: '#f0f0f0' }
            }}
          >
            <Refresh />
          </IconButton>
        </Box>

        {recordings.map((recording) => (
          <Box 
            key={recording.id} 
            sx={{ 
              mb: 3,
              border: '1px solid #e1e8ed',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: '#f7f9fa',
                cursor: 'pointer'
              }
            }}
          >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', p: 3, pb: 2 }}>
              {/* Profile Picture */}
              {user?.user_metadata?.twitter_profile_image ? (
                <img 
                  src={user.user_metadata.twitter_profile_image} 
                  alt="Profile"
                  style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginRight: 16
                  }}
                />
              ) : (
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%', 
                  backgroundColor: '#1da1f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  flexShrink: 0
                }}>
                  <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    {user?.user_metadata?.twitter_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || 'U'}
                  </Typography>
                </Box>
              )}

              {/* User Info */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#000000' }}>
                    {user?.user_metadata?.twitter_name || user?.user_metadata?.full_name || 'User'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#536471' }}>
                    @{user?.user_metadata?.twitter_username || user?.user_metadata?.user_name || 'username'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#536471' }}>·</Typography>
                  <Typography variant="body2" sx={{ color: '#536471' }}>
                    {formatTimeAgo(recording.created_at)}
                  </Typography>
                  <Chip
                    label={recording.status}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ px: 3, pb: 2 }}>
              {/* Original Recording */}
              {recording.transcripts?.[0] && (
                <Box sx={{ 
                  mb: 2, 
                  p: 2, 
                  bgcolor: '#f7f9fa', 
                  borderRadius: '12px',
                  border: '1px solid #e1e8ed'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#536471', fontSize: '0.875rem' }}>
                    Original Recording
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.5, color: '#0f1419', fontSize: '0.95rem' }}>
                    "{truncateText(recording.transcripts[0].text, 200)}"
                  </Typography>
                </Box>
              )}

              {/* Draft Content */}
              {recording.drafts?.[0] && (
                <>
                  {/* Attachments */}
                  {recording.drafts?.[0]?.attachments && recording.drafts[0].attachments.length > 0 && (
                    <Box sx={{ mb: 2, borderRadius: '12px', overflow: 'hidden', border: '1px solid #e1e8ed' }}>
                      {recording.drafts[0].attachments.length === 1 ? (
                        <img 
                          src={`/api/attachments/${recording.drafts[0].attachments[0].id}/preview`}
                          alt={recording.drafts[0].attachments[0].filename}
                          style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <Box sx={{ 
                          display: 'grid',
                          gridTemplateColumns: recording.drafts[0].attachments.length === 2 ? '1fr 1fr' : '1fr 1fr',
                          gap: '2px',
                          height: '200px'
                        }}>
                          {recording.drafts[0].attachments.slice(0, 4).map((attachment, index) => (
                            <Box key={attachment.id} sx={{ position: 'relative', overflow: 'hidden' }}>
                              <img 
                                src={`/api/attachments/${attachment.id}/preview`}
                                alt={attachment.filename}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                              {index === 3 && recording.drafts?.[0]?.attachments && recording.drafts[0].attachments.length > 4 && (
                                <Box sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '1.5rem',
                                  fontWeight: 700
                                }}>
                                  +{recording.drafts?.[0]?.attachments?.length ? recording.drafts[0].attachments.length - 4 : 0}
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}

                {/* Thread */}
                {recording.drafts?.[0]?.thread && recording.drafts[0].thread.length > 0 && (
                  <Box sx={{ border: '1px solid #e1e8ed', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    {recording.drafts[0].thread.map((tweet, index) => {
                      const isCollapsed = collapsedThreads.has(recording.id)
                      const shouldShow = !isCollapsed || index === 0 || index === (recording.drafts?.[0]?.thread?.length || 1) - 1
                      
                      if (!shouldShow) return null
                      
                      return (
                        <Box key={index} sx={{ 
                          position: 'relative',
                          borderBottom: index < (recording.drafts?.[0]?.thread?.length || 1) - 1 ? '1px solid #e1e8ed' : 'none',
                          '&:hover': { backgroundColor: '#f7f9fa' }
                        }}>
                          {/* Thread connector */}
                          {index > 0 && (
                            <Box sx={{
                              position: 'absolute',
                              left: '24px',
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              backgroundColor: '#e1e8ed',
                              zIndex: 1
                            }} />
                          )}
                          
                          {/* Tweet */}
                          <Box sx={{ display: 'flex', alignItems: 'center', p: 3, pl: index > 0 ? 5 : 3, position: 'relative', zIndex: 2 }}>
                            {/* Profile Picture */}
                            {user?.user_metadata?.twitter_profile_image ? (
                              <img 
                                src={user.user_metadata.twitter_profile_image} 
                                alt="Profile"
                                style={{ 
                                  width: 40, 
                                  height: 40, 
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  marginRight: 16
                                }}
                              />
                            ) : (
                              <Box sx={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                backgroundColor: '#1da1f2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 2,
                                flexShrink: 0
                              }}>
                                <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                                  {user?.user_metadata?.twitter_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || 'U'}
                                </Typography>
                              </Box>
                            )}

                            {/* Content */}
                            <Box sx={{ flex: 1 }}>
                              {/* Header */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#000000' }}>
                                  {user?.user_metadata?.twitter_name || user?.user_metadata?.full_name || 'User'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#536471' }}>
                                  @{user?.user_metadata?.twitter_username || user?.user_metadata?.user_name || 'username'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#536471' }}>·</Typography>
                                <Typography variant="body2" sx={{ color: '#536471' }}>
                                  {formatTimeAgo(recording.created_at)}
                                </Typography>
                                {recording.drafts?.[0]?.thread && recording.drafts[0].thread.length > 1 && (
                                  <Chip 
                                    label={`${index + 1}/${recording.drafts[0].thread.length}`}
                                    size="small"
                                    variant="filled"
                                    sx={{ ml: 1, fontSize: '0.75rem', height: 20 }}
                                  />
                                )}
                              </Box>

                              {/* Text */}
                              <Typography variant="body1" sx={{ lineHeight: 1.5, color: '#0f1419', fontSize: '0.95rem', mb: 1 }}>
                                {tweet.text}
                              </Typography>

                              {/* Footer */}
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
                                <Typography variant="caption" sx={{ 
                                  color: tweet.char_count > 280 ? '#e0245e' : '#536471',
                                  fontWeight: tweet.char_count > 280 ? 600 : 400
                                }}>
                                  {tweet.char_count}/280 characters
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#536471' }}>Draft</Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                )}
                </>
              )}

              {/* Posted Status */}
              {recording.posts?.[0] && (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  backgroundColor: '#f0f8ff', 
                  borderRadius: '12px', 
                  border: '1px solid #1da1f2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1da1f2' }}>
                    ✓ Posted to Twitter
                  </Typography>
                  {settings.autoPost && (
                    <Chip label="Auto-posted" size="small" sx={{ backgroundColor: '#1da1f2', color: 'white', fontSize: '0.75rem', height: 20 }} />
                  )}
                  <Typography variant="caption" sx={{ color: '#536471', ml: 'auto' }}>
                    {formatTimeAgo(recording.posts[0].posted_at)}
                  </Typography>
                </Box>
              )}

              {/* Actions */}
              {recording.status === 'ready' && recording.drafts?.[0] && (
                <Box sx={{ 
                  mt: 2, 
                  pt: 2, 
                  borderTop: '1px solid #e1e8ed', 
                  display: 'flex', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  px: 3,
                  pb: 3
                }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleEditDraft(recording.drafts![0])}
                  >
                    Edit
                  </Button>
                  <input
                    accept="image/*,video/mp4,video/mov"
                    style={{ display: 'none' }}
                    id={`attachment-upload-${recording.drafts[0].id}`}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file && recording.drafts?.[0]) {
                        handleAttachmentUpload(file, recording.drafts[0].id)
                      }
                      e.target.value = ''
                    }}
                  />
                  <label htmlFor={`attachment-upload-${recording.drafts[0].id}`}>
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      disabled={uploadingAttachment || loading}
                    >
                      {uploadingAttachment ? 'Uploading...' : 'Attach'}
                    </Button>
                  </label>
                  {!settings.autoPost && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handlePostDraft(recording.drafts![0].id)}
                      disabled={loading}
                    >
                      Post to Twitter
                      {recording.drafts[0].attachments && recording.drafts[0].attachments.length > 0 && (
                        ` (+${recording.drafts[0].attachments.length})`
                      )}
                    </Button>
                  )}
                  {settings.autoPost && (
                    <Chip
                      label="Auto-post enabled"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
            </Box>
          </Box>
        ))}

        {recordings.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 8, 
            px: 4,
            borderRadius: '16px',
            border: '1px solid #e1e8ed',
            backgroundColor: '#ffffff'
          }}>
            <Typography variant="h6" color="#536471" sx={{ mb: 2, fontWeight: 400 }}>
              No recordings yet
            </Typography>
            <Typography variant="body2" color="#536471">
              Start by recording your first voice note
            </Typography>
          </Box>
        )}
      </Box>

      {/* Edit Draft Dialog */}
      <Dialog open={!!editingDraft} onClose={() => setEditingDraft(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>Edit Draft</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Attachments Section */}
          {editingDraft && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" sx={{ mb: 3, fontWeight: 500 }}>
                Attachments
              </Typography>
              
              {/* Existing Attachments */}
              {editingDraft && editingDraft.attachments && editingDraft.attachments.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {editingDraft?.attachments?.map((attachment) => (
                    <Box key={attachment.id} sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      p: 2, 
                      border: '1px solid #f0f0f0', 
                      borderRadius: 2, 
                      mb: 2,
                      backgroundColor: '#fafafa'
                    }}>
                      {/* Preview thumbnail */}
                      <Box sx={{ 
                        width: 60, 
                        height: 60, 
                        borderRadius: 1, 
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {attachment.media_type === 'image' ? (
                          <>
                            <img 
                              src={`/api/attachments/${attachment.id}/preview`}
                              alt={attachment.filename}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                  nextElement.style.display = 'flex';
                                }
                              }}
                            />
                            {/* Fallback icon for failed image loads */}
                            <Box sx={{ 
                              display: 'none',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%', 
                              height: '100%', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              backgroundColor: '#f5f5f5'
                            }}>
                              <Image sx={{ color: 'text.secondary' }} />
                            </Box>
                          </>
                        ) : attachment.media_type === 'video' ? (
                          <PlayArrow sx={{ color: 'text.secondary' }} />
                        ) : (
                          <AttachFile sx={{ color: 'text.secondary' }} />
                        )}
                      </Box>
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {attachment.filename}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatFileSize(attachment.file_size)} • {attachment.media_type}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <Close />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Add Attachment Button */}
              <input
                accept="image/*,video/mp4,video/mov"
                style={{ display: 'none' }}
                id="edit-attachment-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file && editingDraft) {
                    handleAttachmentUpload(file, editingDraft.id)
                  }
                  e.target.value = ''
                }}
              />
              <label htmlFor="edit-attachment-upload">
                <Button
                  component="span"
                  variant="outlined"
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment ? 'Uploading...' : 'Add Attachment'}
                </Button>
              </label>
            </Box>
          )}

          {/* Tweet Editing */}
          {editedTweets.map((tweet, index) => (
            <Box key={index}>
              {/* Twitter-style tweet card for editing */}
              <Box sx={{ 
                mb: index < editedTweets.length - 1 ? 3 : 0, 
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                {/* Tweet header */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 2, 
                  pb: 1,
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    backgroundColor: '#1da1f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                    flexShrink: 0
                  }}>
                    <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                      {user?.user_metadata?.full_name?.charAt(0) || 'U'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#000000' }}>
                        {user?.user_metadata?.full_name || 'User'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666666' }}>
                        @{user?.user_metadata?.user_name || 'username'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666666' }}>
                        ·
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666666' }}>
                        now
                      </Typography>
                    </Box>
                  </Box>
                  {editedTweets.length > 1 && (
                    <Chip 
                      label={`${index + 1}/${editedTweets.length}`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.75rem',
                        height: 20,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  )}
                </Box>

                {/* Tweet content editing */}
                <Box sx={{ p: 2, pt: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={tweet.text}
                    onChange={(e) => handleUpdateTweet(index, e.target.value)}
                    placeholder="What's happening?"
                    error={tweet.char_count > 280}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        border: 'none',
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        color: '#000000'
                      }
                    }}
                  />
                  
                  {/* Tweet footer */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    pt: 1,
                    borderTop: '1px solid #f8f8f8'
                  }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: tweet.char_count > 280 ? '#e0245e' : '#666666',
                        fontWeight: tweet.char_count > 280 ? 600 : 400
                      }}
                    >
                      {tweet.char_count}/280 characters
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: '#666666' }}>
                        Draft
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              
              {/* Thread connector */}
              {index < editedTweets.length - 1 && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  my: 2,
                  position: 'relative'
                }}>
                  {/* Vertical line */}
                  <Box sx={{ 
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: '#e0e0e0',
                    transform: 'translateX(-50%)'
                  }} />
                  
                  {/* Join button */}
                  <IconButton
                    size="small"
                    onClick={() => handleJoinTweets(index, '', '', true)}
                    sx={{ 
                      backgroundColor: '#ffffff',
                      border: '2px solid #e0e0e0',
                      zIndex: 1,
                      '&:hover': {
                        borderColor: '#1da1f2',
                        backgroundColor: '#f0f8ff'
                      }
                    }}
                    title="Join with next tweet"
                  >
                    <Add fontSize="small" sx={{ color: '#666666' }} />
                  </IconButton>
                </Box>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setEditingDraft(null)}>Cancel</Button>
          <Button onClick={handleSaveDraft} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}