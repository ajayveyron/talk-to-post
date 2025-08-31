/**
 * TalkToPost Configuration File
 * 
 * This file contains all configurable settings for the application.
 */

export interface AIConfig {
  defaultSystemPrompt: string
  model: {
    provider: string
    name: string
    temperature: number
    maxTokens: number
  }
  transcription: {
    model: string
    language: string
    responseFormat: string
  }
}

export interface FeatureFlags {
  spacebarRecording: boolean
  audioVisualization: boolean
  customSystemPrompts: boolean
}

export interface UIConfig {
  recordingButtonText: {
    ready: string
    recording: string
    processing: string
    noPermission: string
  }
  maxPromptLength: number
}

export interface TwitterConfig {
  scopes: string[]
}

export interface Config {
  ai: AIConfig
  features: FeatureFlags
  ui: UIConfig
  twitter: TwitterConfig
}

const config: Config = {
  // AI Configuration
  ai: {
    // Default system prompt for generating tweets from transcripts
    defaultSystemPrompt: `You are an editor for startup/tech Twitter.
- Remove filler, hedging, repetition.
- Output either single tweet or thread (1 idea per tweet).
- Max 280 chars per tweet.
- Keep proper nouns as-is.
- Output JSON: { "mode": "tweet"|"thread", "tweets": [{"text": "...", "char_count": 123}, ...] }.`,

    // Model configuration
    model: {
      provider: 'openrouter',
      name: 'anthropic/claude-3.5-sonnet',
      temperature: 0.7,
      maxTokens: 1000,
    },

    // Transcription settings
    transcription: {
      model: 'whisper-1',
      language: 'en',
      responseFormat: 'verbose_json',
    },
  },

  // Feature flags (can be toggled on/off)
  features: {
    spacebarRecording: true,
    audioVisualization: false, // Disabled for now
    customSystemPrompts: false, // Disabled for now
  },

  // UI Configuration
  ui: {
    recordingButtonText: {
      ready: '🎤 Ready to record - tap to start',
      recording: '🔴 Recording...',
      processing: '⏳ Processing...',
      noPermission: '🔒 Allow Microphone',
    },
    
    maxPromptLength: 2000,
  },

  // Twitter configuration
  twitter: {
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
}

// Helper function to check if a feature is enabled
export const isFeatureEnabled = (featureName: keyof FeatureFlags): boolean => {
  return config.features[featureName] || false
}

// Helper function to get AI configuration
export const getAIConfig = (): AIConfig => {
  return config.ai
}

// Helper function to get system prompt
export const getSystemPrompt = (): string => {
  return config.ai.defaultSystemPrompt
}

// Helper function to get UI text
export const getUIText = (section: keyof UIConfig, key: string): string => {
  const sectionConfig = config.ui[section]
  if (sectionConfig && typeof sectionConfig === 'object' && key in sectionConfig) {
    return (sectionConfig as any)[key] || ''
  }
  return ''
}

export default config
