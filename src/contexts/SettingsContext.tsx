'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Settings {
  customPrompt: string
  autoPost: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  language: string
}

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  saveSettings: () => Promise<void>
  isSaving: boolean
  saved: boolean
}

const defaultSettings: Settings = {
  customPrompt: '',
  autoPost: false,
  theme: 'system',
  notifications: true,
  language: 'en',
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
  saveSettings: async () => {},
  isSaving: false,
  saved: false,
})

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedSettings = localStorage.getItem('talktopost-settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
  }, [])

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      localStorage.setItem('talktopost-settings', JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      saveSettings,
      isSaving,
      saved,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}
