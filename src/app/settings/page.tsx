"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Grid,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Twitter,
  Save,
  Refresh,
  Person,
  SmartToy,
  LinkRounded,
  LinkOff,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import Link from "next/link";

// Settings interface is already defined in SettingsContext

export default function SettingsPage() {
  const { settings, updateSetting, saveSettings, isSaving, saved } = useSettings()
  const { user, signInWithTwitter, signOut, isTwitterConnected } = useAuth()
  const [disconnectDialog, setDisconnectDialog] = useState(false)

  // Settings are handled by the SettingsContext, no need for local state management

  const handleTwitterConnect = async () => {
    try {
      await signInWithTwitter();
    } catch (error) {
      console.error("Failed to connect Twitter:", error);
    }
  };

  const handleTwitterDisconnect = async () => {
    try {
      await signOut();
      setDisconnectDialog(false);
    } catch (error) {
      console.error("Failed to disconnect Twitter:", error);
    }
  };

  const handleSettingChange = (
    key: string,
    value: string | boolean,
  ) => {
    updateSetting(key as any, value as any);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <SettingsIcon sx={{ mr: 2, verticalAlign: "middle" }} />
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your Voice to Twitter experience
        </Typography>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: "middle" }} />
                Profile
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                {user?.user_metadata?.avatar_url && (
                  <Avatar
                    src={user.user_metadata.avatar_url}
                    sx={{ width: 64, height: 64 }}
                  />
                )}
                <Box>
                  <Typography variant="h6">
                    {user?.user_metadata?.full_name ||
                      user?.user_metadata?.user_name ||
                      "Not signed in"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email || "No email provided"}
                  </Typography>
                  {isTwitterConnected && (
                    <Chip
                      icon={<Twitter />}
                      label="Twitter Connected"
                      color="primary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
              </Box>

              {!isTwitterConnected ? (
                <Button
                  variant="contained"
                  startIcon={<LinkRounded />}
                  onClick={handleTwitterConnect}
                  sx={{ mr: 1 }}
                >
                  Connect Twitter
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<LinkOff />}
                  onClick={() => setDisconnectDialog(true)}
                >
                  Disconnect Twitter
                </Button>
              )}

              {!user && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Sign in to access all settings and features
                  </Typography>
                  <Link href="/" passHref style={{ textDecoration: "none" }}>
                    <Button variant="outlined" size="small">
                      Go to Home
                    </Button>
                  </Link>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Customization Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SmartToy sx={{ mr: 1, verticalAlign: "middle" }} />
                AI Customization
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Customize how AI refines your voice recordings into Twitter
                posts
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Custom System Prompt"
                  placeholder="Add your custom instructions for AI refinement (e.g., 'Make posts more professional', 'Add emojis', 'Use specific hashtags')"
                  value={settings.customPrompt}
                  onChange={(e) =>
                    handleSettingChange("customPrompt", e.target.value)
                  }
                  helperText="This will be appended to the core system prompt for all AI refinements"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoPost}
                    onChange={(e) =>
                      handleSettingChange("autoPost", e.target.checked)
                    }
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Auto-post after AI refinement
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Automatically post to Twitter after recording,
                      transcription, and AI refinement
                    </Typography>
                  </Box>
                }
              />
            </CardContent>
          </Card>
        </Grid>

        {/* App Preferences Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                App Preferences
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.theme}
                    label="Theme"
                    onChange={(e) =>
                      handleSettingChange("theme", e.target.value)
                    }
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={settings.language}
                    label="Language"
                    onChange={(e) =>
                      handleSettingChange("language", e.target.value)
                    }
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications}
                      onChange={(e) =>
                        handleSettingChange("notifications", e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label="Enable notifications"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    // Mock refresh action
                    console.log("Refreshing data...");
                  }}
                  fullWidth
                  disabled={!user}
                >
                  Refresh Data
                </Button>

                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    // Clear localStorage and reset to defaults
                    localStorage.removeItem("talktopost-settings");
                    updateSetting('customPrompt', '');
                    updateSetting('autoPost', false);
                    updateSetting('theme', 'system');
                    updateSetting('notifications', true);
                    updateSetting('language', 'en');
                  }}
                  fullWidth
                >
                  Reset to Defaults
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
                        <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={saveSettings}
                  disabled={isSaving}
                  sx={{ minWidth: 200 }}
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
      </Box>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialog}
        onClose={() => setDisconnectDialog(false)}
      >
        <DialogTitle>Disconnect Twitter</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disconnect your Twitter account? You
            won&apos;t be able to post tweets until you reconnect.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialog(false)}>Cancel</Button>
          <Button onClick={handleTwitterDisconnect} color="error">
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
