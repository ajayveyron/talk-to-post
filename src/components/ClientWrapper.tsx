'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material'
import { useState, useEffect } from 'react'
import { Twitter, Logout } from '@mui/icons-material'
import theme from '@/lib/theme'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function Navigation() {
  const { user, signInWithTwitter, signOut, loading, isTwitterConnected } = useAuth()

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

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Voice to Twitter
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        <Navigation />
        <main>
          {children}
        </main>
      </AuthProvider>
    </ThemeProvider>
  )
}
