'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Switch, FormControlLabel, Tooltip, IconButton } from '@mui/material'
import { useState, useEffect } from 'react'
import { Twitter, Logout, FlashOn, FlashOff } from '@mui/icons-material'
import theme from '@/lib/theme'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext'

function Navigation() {
  const { user, signInWithTwitter, signOut, loading, isTwitterConnected } = useAuth()
  const { settings, updateSetting } = useSettings()
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
      // AuthContext will handle all cleanup including localStorage
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

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
          {/* Check if user is authenticated via Supabase or localStorage fallback */}
          {(() => {
            const isAuthenticated = user || (typeof window !== 'undefined' && localStorage.getItem('twitter_authenticated') === 'true')
            const isConnected = isTwitterConnected || (typeof window !== 'undefined' && localStorage.getItem('twitter_authenticated') === 'true')
            
            return (
              <>
                {isConnected && (
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
                
                {isAuthenticated && isConnected ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', columnGap: 0.5 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, lineHeight: 1.2 }}>
                        {user?.user_metadata?.twitter_name || 
                         user?.user_metadata?.full_name || 
                         (typeof window !== 'undefined' && localStorage.getItem('twitter_username')) || 'User'}
                      </Typography>
                      <Typography
                        component="a"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleSignOut();
                        }}
                        sx={{
                          color: 'error.main',
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          lineHeight: 1.2,
                          textDecoration: 'none',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        Log out
                      </Typography>
                    </Box>
                    {user?.user_metadata?.twitter_profile_image ? (
                      <Avatar
                        src={user.user_metadata.twitter_profile_image}
                        sx={{ 
                          width: 32, 
                          height: 32
                        }}
                      />
                    ) : (
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32,
                        backgroundColor: '#1da1f2'
                      }}>
                        <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                          {user?.user_metadata?.twitter_name?.charAt(0) || 
                           user?.user_metadata?.twitter_username?.charAt(0) ||
                           (typeof window !== 'undefined' && localStorage.getItem('twitter_username')?.charAt(0)) || 'U'}
                        </Typography>
                      </Avatar>
                    )}
                    {/* Twitter icon linking to user's Twitter profile */}
                    {(() => {
                      // Get the Twitter username from user metadata or localStorage
                      const twitterUsername =
                        user?.user_metadata?.twitter_username ||
                        (typeof window !== 'undefined' && localStorage.getItem('twitter_username'));
                      
                      if (!twitterUsername) return null;
                      return (
                        <Tooltip title="View Twitter profile">
                          <IconButton
                            component="a"
                            href={`https://twitter.com/${twitterUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: '#1da1f2', p: 0.5 }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M22.46 5.924c-.793.352-1.645.59-2.54.698a4.48 4.48 0 0 0 1.963-2.475 8.94 8.94 0 0 1-2.828 1.08A4.48 4.48 0 0 0 16.11 4c-2.48 0-4.49 2.014-4.49 4.495 0 .353.04.697.116 1.025C7.728 9.37 4.1 7.57 1.67 4.95a4.49 4.49 0 0 0-.607 2.262c0 1.56.793 2.936 2.003 3.744a4.47 4.47 0 0 1-2.034-.563v.057c0 2.18 1.55 4.002 3.604 4.418a4.51 4.51 0 0 1-2.027.077c.572 1.785 2.23 3.084 4.197 3.12A8.99 8.99 0 0 1 2 19.54a12.7 12.7 0 0 0 6.92 2.03c8.302 0 12.846-6.876 12.846-12.844 0-.196-.004-.392-.013-.586A9.18 9.18 0 0 0 24 4.59a8.98 8.98 0 0 1-2.54.697z"/>
                            </svg>
                          </IconButton>
                        </Tooltip>
                      );
                    })()}
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
              </>
            )
          })()}
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
