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
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ minHeight: 64, px: 3 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 500 }}>
          Voice to Twitter
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {isTwitterConnected && (
            <Tooltip title={settings.autoPost ? "Auto-post enabled" : "Auto-post disabled"}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoPost}
                    onChange={(e) => updateSetting('autoPost', e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Auto-post
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
            </Tooltip>
          )}
          
          {user && isTwitterConnected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {user.user_metadata?.avatar_url && (
                  <Avatar
                    src={user.user_metadata.avatar_url}
                    sx={{ width: 28, height: 28 }}
                  />
                )}
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.user_metadata?.full_name || user.user_metadata?.user_name || 'User'}
                </Typography>
              </Box>
              <Button
                variant="text"
                onClick={handleSignOut}
                size="small"
                sx={{ color: 'text.secondary', minWidth: 'auto', px: 1 }}
              >
                Sign out
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              onClick={handleTwitterLogin}
              disabled={loading}
              size="small"
              sx={{ minWidth: 140 }}
            >
              {loading ? 'Connecting...' : 'Connect Twitter'}
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
