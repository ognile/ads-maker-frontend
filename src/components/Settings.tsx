import { useState, useEffect } from 'react'
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { FacebookConnect } from './FacebookConnect'

interface SettingsData {
  image_generation_enabled: boolean
}

const API_BASE = '/api'

export function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`)
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSetting = async (key: keyof SettingsData, value: boolean) => {
    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to update setting:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-[#A3A3A3]">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={fetchSettings}
            className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="border border-[#E5E5E5] p-4">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide mb-4">
              Generation
            </h3>

            <div className="space-y-4">
              {/* Image Generation Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Image Generation</span>
                  <p className="text-xs text-[#A3A3A3] mt-0.5">
                    Generate images for each ad concept (uses Gemini API, costs ~$0.05/image)
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('image_generation_enabled', !settings?.image_generation_enabled)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings?.image_generation_enabled ? 'bg-black' : 'bg-[#E5E5E5]'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings?.image_generation_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Facebook Integration */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
              Facebook Ads Integration
            </h3>
            <FacebookConnect />
          </div>

          {/* Info */}
          <div className="text-xs text-[#A3A3A3] space-y-1">
            <p>Settings are saved automatically when changed.</p>
            <p>Changes take effect on the next generation cycle.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
