'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Switch, FormControlLabel, Tooltip } from '@mui/material'
import { useState, useEffect } from 'react'
import { Twitter, Logout, FlashOn, FlashOff } from '@mui/icons-material'
import theme from '@/lib/theme'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext'

function Navigation() {
  const { user, signInWithTwitter, signOut, loading } = useAuth()
  const { settings, updateSetting } = useSettings()
  const [isTwitterConnected, setIsTwitterConnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleTwitterLogin = async () => {
    try {
      await signInWithTwitter()
    } catch (error) {
      console.error('Failed to sign in with Twitter:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  // Check Twitter connection status
  useEffect(() => {
    if (!mounted) return

    const checkTwitterConnection = async () => {
      // Check localStorage first
      const localConnected = localStorage.getItem('twitter_connected') === 'true'
      
      if (localConnected) {
        setIsTwitterConnected(true)
      } else {
        setIsTwitterConnected(false)
      }

      // Also check server-side status
      try {
        const response = await fetch('/api/check-twitter-status')
        const data = await response.json()
        
        if (data.success && data.summary.has_usable_account) {
          setIsTwitterConnected(true)
          localStorage.setItem('twitter_connected', 'true')
        } else {
          setIsTwitterConnected(false)
          localStorage.removeItem('twitter_connected')
        }
      } catch (error) {
        console.error('Failed to check Twitter status:', error)
        // If server check fails, fall back to localStorage
      }
    }

    checkTwitterConnection()
  }, [user, mounted])

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Voice to Twitter
          </Typography>
          <Button color="inherit" disabled size="small">
            Loading...
          </Button>
        </Toolbar>
      </AppBar>
    )
  }



  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Voice to Twitter
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isTwitterConnected && (
            <Tooltip title={settings.autoPost ? "Auto-post enabled - tweets will post automatically after AI refinement" : "Auto-post disabled - manual posting required"}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoPost}
                    onChange={(e) => updateSetting('autoPost', e.target.checked)}
                    color="secondary"
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {settings.autoPost ? <FlashOn fontSize="small" /> : <FlashOff fontSize="small" />}
                    <Typography variant="body2" sx={{ color: 'inherit' }}>
                      Auto-post
                    </Typography>
                  </Box>
                }
                sx={{ 
                  margin: 0,
                  '& .MuiFormControlLabel-label': {
                    color: settings.autoPost ? 'secondary.main' : 'text.secondary'
                  }
                }}
              />
            </Tooltip>
          )}
          
          {user ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {user.user_metadata?.avatar_url && (
                  <Avatar
                    src={user.user_metadata.avatar_url}
                    sx={{ width: 32, height: 32 }}
                  />
                )}
                <Typography variant="body2">
                  {user.user_metadata?.full_name || user.user_metadata?.user_name || 'User'}
                </Typography>
                {isTwitterConnected && (
                  <Twitter color="primary" fontSize="small" />
                )}
              </Box>
              <Button
                color="inherit"
                onClick={handleSignOut}
                startIcon={<Logout />}
                size="small"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              color="inherit"
              onClick={handleTwitterLogin}
              startIcon={<Twitter />}
              disabled={loading}
              size="small"
            >
              Sign in with Twitter
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SettingsProvider>
          <Navigation />
          <main>
            {children}
          </main>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
