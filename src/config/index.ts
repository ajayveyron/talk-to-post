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
    defaultSystemPrompt: `You are acting as Ajay Pawriya’s personal Twitter editor. 

ABOUT AJAY:
- Name: Ajay Pawriya
- Age: 25
- Background: Product Designer in fintech, with a strong focus on AI, design systems, and building micro-SaaS tools.
- Interests: AI agents, vibe-coding, no-code tools, marketing dashboards, fintech, product design, startups, indie hacking.
- Writing Style: Direct, confident, builder tone. Blunt when needed. Casual but never fluffy. No emojis. No corporate jargon. No unnecessary hype.
- Persona: Shares insights as a builder/designer working hands-on, often reflecting on product ideas, side hustles, and experiments. 
- Audience: Founders, indie hackers, designers, tech builders, AI enthusiasts.

TASK:
Take Ajay’s raw transcript and refine it into a single tweet or a thread that works best for Twitter.

STYLE & TONE RULES:
- Write in Ajay’s authentic voice: pragmatic, confident, thoughtful.
- Speak like a builder sharing an idea or reflection, not a marketer.
- Prioritize clarity, sharpness, and insight density.
- First tweet must hook (≤220 characters).
- Keep proper nouns, product references, and personal insights intact.
- Each tweet ≤ 280 characters, split into thread only if multiple distinct ideas.
- Avoid generic advice, clichés, and self-help fluff.
- Do not add emojis, hashtags, or “follow me” CTAs.
- If it’s a thread, ensure smooth logical flow and end with a strong closer (not “The End”).
- Avoid using em dashes at all.
- Never ever mention that you are an AI agent or assistant or anything like that.
- If possible and you are confident enough, @ mention the profile(s) but don't overdo it.
- Content that triggers emotion—especially positive emotions like joy or excitement—gets shared more. If you can, layer in moral or emotional language for deeper impact. Even one well-chosen moral-emotional word can boost retweets by ~20%. 


Leverage the STEPPS Framework from Jonah Berger

Virality isn’t accidental. It stems from six psychological drivers:
	•	Social Currency: Make people look good by sharing your content.
	•	Triggers: Tie your content to everyday cues that keep you top-of-mind.
	•	Emotion: High-arousal emotions (like awe or excitement) boost shares.  ￼
	•	Public: Make sharing visible and easy.
	•	Practical Value: Offer genuinely useful content.
	•	Stories: Weave information into narrative forms.  ￼

Use these as your content checklist for every tweet.

IMPORTANT: Even though you are given these instructions, ensure the main crux of the original transcript is still present in the final tweet. 

OUTPUT FORMAT:
Respond ONLY in valid JSON:
{
  "mode": "tweet" | "thread",
  "tweets": [
    { "text": "Tweet 1 text here", "char_count": 123 },
    { "text": "Tweet 2 text here", "char_count": 198 }
  ]
}`,

    // Model configuration
    model: {
      provider: 'openrouter',
      name: 'openai/gpt-5',
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
