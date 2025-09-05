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
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 300 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your Voice to Twitter experience
        </Typography>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 4, borderRadius: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Profile Section */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2, border: '1px solid #f0f0f0' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, mb: 3 }}>
                Profile
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4 }}>
                {user?.user_metadata?.avatar_url && (
                  <Avatar
                    src={user.user_metadata.avatar_url}
                    sx={{ width: 64, height: 64 }}
                  />
                )}
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {user?.user_metadata?.full_name ||
                      user?.user_metadata?.user_name ||
                      "Not signed in"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {user?.email || "No email provided"}
                  </Typography>
                  {isTwitterConnected && (
                    <Chip
                      label="Twitter Connected"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              {!isTwitterConnected ? (
                <Button
                  variant="contained"
                  onClick={handleTwitterConnect}
                >
                  Connect Twitter
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => setDisconnectDialog(true)}
                >
                  Disconnect Twitter
                </Button>
              )}

              {!user && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
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
          <Card sx={{ borderRadius: 2, border: '1px solid #f0f0f0' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                AI Customization
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Customize how AI refines your voice recordings into Twitter posts
              </Typography>

              <Box sx={{ mb: 4 }}>
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
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Auto-post after AI refinement
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Automatically post to Twitter after recording, transcription, and AI refinement
                    </Typography>
                  </Box>
                }
              />
            </CardContent>
          </Card>
        </Grid>

        {/* App Preferences Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, border: '1px solid #f0f0f0' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, mb: 3 }}>
                App Preferences
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormControl fullWidth>
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

                <FormControl fullWidth>
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
          <Card sx={{ borderRadius: 2, border: '1px solid #f0f0f0' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, mb: 3 }}>
                Quick Actions
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    console.log("Refreshing data...");
                  }}
                  fullWidth
                  disabled={!user}
                >
                  Refresh Data
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => {
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
      <Box sx={{ mt: 6, display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          size="large"
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
        <DialogTitle sx={{ pb: 2 }}>Disconnect Twitter</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            Are you sure you want to disconnect your Twitter account? You won&apos;t be able to post tweets until you reconnect.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setDisconnectDialog(false)}>Cancel</Button>
          <Button onClick={handleTwitterDisconnect} variant="contained">
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
