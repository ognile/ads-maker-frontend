import { useState, useEffect } from 'react'
import { RefreshCw, Settings as SettingsIcon, Bot, Cpu, Eye, Image as ImageIcon, Target, DollarSign, BookOpen, Save } from 'lucide-react'
import { FacebookConnect } from './FacebookConnect'
import { Button } from './ui/button'
import { AdvancedSettings } from './AdvancedSettings'
import { AutonomousSettings } from './AutonomousSettings'
import { FormatsSection } from './FormatsSection'
import { UsageTracking } from './UsageTracking'

interface SettingsData {
  image_generation_enabled: boolean
  image_aspect_ratio: string
}

interface ModelOption {
  id: string
  name: string
  provider: string
  thinking_enabled?: boolean
  supports_thinking?: boolean
}

interface ThinkingSettings {
  thinking_budget: number
  min_budget: number
  max_budget: number
  default_budget: number
}

interface ModelSettings {
  available_models: Record<string, ModelOption[]>
  current_models: Record<string, string>
}

interface PerformanceGoals {
  id: string | null
  product_id: string | null
  target_cpa: number
  target_roas: number
  super_winner_min_spend: number
  winner_min_spend: number
  promising_max_spend: number
  promising_min_sales: number
  loser_min_spend: number
}

import { API_BASE } from '../config'
import { authFetch } from '../auth'

// URL Tags (UTM Parameters) Component
function UrlTagsField() {
  const [urlTags, setUrlTags] = useState<string>('')
  const [originalUrlTags, setOriginalUrlTags] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUrlTags = async () => {
      try {
        const res = await authFetch(`${API_BASE}/settings/url-tags`)
        if (res.ok) {
          const data = await res.json()
          setUrlTags(data.default_url_tags || '')
          setOriginalUrlTags(data.default_url_tags || '')
        }
      } catch (error) {
        console.error('Failed to fetch URL tags:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUrlTags()
  }, [])

  const saveUrlTags = async () => {
    setIsSaving(true)
    try {
      const res = await authFetch(`${API_BASE}/settings/url-tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_url_tags: urlTags || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setOriginalUrlTags(data.default_url_tags || '')
      }
    } catch (error) {
      console.error('Failed to save URL tags:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = urlTags !== originalUrlTags

  if (isLoading) return null

  return (
    <div className="border border-[#E5E5E5] p-4 mt-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium">URL Tags (UTM Parameters)</span>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Appended to all ad links. Supports dynamic params like {'{{ad.id}}'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={urlTags}
          onChange={(e) => setUrlTags(e.target.value)}
          placeholder="utm_source={{site_source_name}}&utm_adid={{ad.id}}"
          className="flex-1 border border-[#E5E5E5] px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-black"
        />
        <Button
          size="sm"
          onClick={saveUrlTags}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
      {urlTags && (
        <p className="text-xs text-[#A3A3A3] mt-2">
          Preview: mynuora.com/products/gummies?{urlTags}
        </p>
      )}
    </div>
  )
}

const TASK_LABELS: Record<string, { label: string; description: string; icon: typeof Bot }> = {
  orchestrator: {
    label: 'Orchestrator',
    description: 'Chat and command parsing',
    icon: Bot,
  },
  copywriter: {
    label: 'Copywriter',
    description: 'Ad copy generation and review',
    icon: Cpu,
  },
  visual_analyzer: {
    label: 'Visual Analyzer',
    description: 'Image and creative analysis',
    icon: Eye,
  },
  image_generator: {
    label: 'Image Generator',
    description: 'AI image generation',
    icon: ImageIcon,
  },
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [modelSettings, setModelSettings] = useState<ModelSettings | null>(null)
  const [thinkingSettings, setThinkingSettings] = useState<ThinkingSettings | null>(null)
  const [goals, setGoals] = useState<PerformanceGoals | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savingModel, setSavingModel] = useState<string | null>(null)
  const [savingThinking, setSavingThinking] = useState(false)
  const [savingGoals, setSavingGoals] = useState(false)
  const [showAdvancedGoals, setShowAdvancedGoals] = useState(false)

  // Copywriting principles state
  const [copywritingPrinciples, setCopywritingPrinciples] = useState<string>('')
  const [originalPrinciples, setOriginalPrinciples] = useState<string>('')
  const [savingPrinciples, setSavingPrinciples] = useState(false)
  const [showPrinciples, setShowPrinciples] = useState(false)

  // Local thinking budget for slider
  const [localThinkingBudget, setLocalThinkingBudget] = useState<number>(10000)

  const fetchSettings = async () => {
    try {
      const [settingsRes, modelsRes, goalsRes, principlesRes, thinkingRes] = await Promise.all([
        authFetch(`${API_BASE}/settings`),
        authFetch(`${API_BASE}/settings/models`),
        authFetch(`${API_BASE}/settings/goals`),
        authFetch(`${API_BASE}/settings/copywriting-principles`),
        authFetch(`${API_BASE}/settings/thinking`),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
      }

      if (modelsRes.ok) {
        const data = await modelsRes.json()
        setModelSettings(data)
      }

      if (goalsRes.ok) {
        const data = await goalsRes.json()
        setGoals(data)
      }

      if (principlesRes.ok) {
        const data = await principlesRes.json()
        setCopywritingPrinciples(data.principles)
        setOriginalPrinciples(data.principles)
      }

      if (thinkingRes.ok) {
        const data = await thinkingRes.json()
        setThinkingSettings(data)
        setLocalThinkingBudget(data.thinking_budget)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateThinkingBudget = async (budget: number) => {
    setSavingThinking(true)
    try {
      const res = await authFetch(`${API_BASE}/settings/thinking/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget }),
      })
      if (res.ok) {
        const data = await res.json()
        setThinkingSettings(prev => prev ? { ...prev, thinking_budget: data.thinking_budget } : null)
      }
    } catch (error) {
      console.error('Failed to update thinking budget:', error)
    } finally {
      setSavingThinking(false)
    }
  }

  const savePrinciples = async () => {
    setSavingPrinciples(true)
    try {
      const res = await authFetch(`${API_BASE}/settings/copywriting-principles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ principles: copywritingPrinciples }),
      })
      if (res.ok) {
        setOriginalPrinciples(copywritingPrinciples)
      }
    } catch (error) {
      console.error('Failed to save principles:', error)
    } finally {
      setSavingPrinciples(false)
    }
  }

  const updateGoals = async (updates: Partial<PerformanceGoals>) => {
    setSavingGoals(true)
    try {
      const res = await authFetch(`${API_BASE}/settings/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
      }
    } catch (error) {
      console.error('Failed to update goals:', error)
    } finally {
      setSavingGoals(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSetting = async (key: keyof SettingsData, value: boolean | string) => {
    setIsSaving(true)
    try {
      const res = await authFetch(`${API_BASE}/settings`, {
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

  const updateModel = async (task: string, modelId: string) => {
    setSavingModel(task)
    try {
      const res = await authFetch(`${API_BASE}/settings/models`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, model_id: modelId }),
      })
      if (res.ok) {
        setModelSettings(prev => prev ? {
          ...prev,
          current_models: { ...prev.current_models, [task]: modelId }
        } : null)
      }
    } catch (error) {
      console.error('Failed to update model:', error)
    } finally {
      setSavingModel(null)
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

          {/* API Usage & Costs */}
          <UsageTracking />

          {/* Performance Goals */}
          {goals && (
            <div className="border border-[#E5E5E5] p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-[#737373]" />
                <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                  Performance Goals
                </h3>
              </div>

              <div className="space-y-4">
                {/* Main Goals */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Target CPA
                    </label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#A3A3A3]" />
                      <input
                        type="number"
                        value={goals.target_cpa}
                        onChange={(e) => updateGoals({ target_cpa: parseFloat(e.target.value) || 0 })}
                        disabled={savingGoals}
                        className="w-full border border-[#E5E5E5] px-3 py-1.5 text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                    <p className="text-xs text-[#A3A3A3] mt-0.5">Max cost per purchase</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Target ROAS
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#A3A3A3]">x</span>
                      <input
                        type="number"
                        step="0.1"
                        value={goals.target_roas}
                        onChange={(e) => updateGoals({ target_roas: parseFloat(e.target.value) || 0 })}
                        disabled={savingGoals}
                        className="w-full border border-[#E5E5E5] px-3 py-1.5 text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                    <p className="text-xs text-[#A3A3A3] mt-0.5">Minimum return on ad spend</p>
                  </div>
                </div>

                {/* Advanced Classification Rules */}
                <div>
                  <button
                    onClick={() => setShowAdvancedGoals(!showAdvancedGoals)}
                    className="text-xs text-[#737373] hover:text-black"
                  >
                    {showAdvancedGoals ? '− Hide' : '+ Show'} advanced classification rules
                  </button>

                  {showAdvancedGoals && (
                    <div className="mt-4 space-y-3 pl-4 border-l-2 border-[#E5E5E5]">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#737373] mb-1">Super Winner Min Spend</label>
                          <input
                            type="number"
                            value={goals.super_winner_min_spend}
                            onChange={(e) => updateGoals({ super_winner_min_spend: parseFloat(e.target.value) || 0 })}
                            disabled={savingGoals}
                            className="w-full border border-[#E5E5E5] px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#737373] mb-1">Winner Min Spend</label>
                          <input
                            type="number"
                            value={goals.winner_min_spend}
                            onChange={(e) => updateGoals({ winner_min_spend: parseFloat(e.target.value) || 0 })}
                            disabled={savingGoals}
                            className="w-full border border-[#E5E5E5] px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#737373] mb-1">Promising Max Spend</label>
                          <input
                            type="number"
                            value={goals.promising_max_spend}
                            onChange={(e) => updateGoals({ promising_max_spend: parseFloat(e.target.value) || 0 })}
                            disabled={savingGoals}
                            className="w-full border border-[#E5E5E5] px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#737373] mb-1">Promising Min Sales</label>
                          <input
                            type="number"
                            value={goals.promising_min_sales}
                            onChange={(e) => updateGoals({ promising_min_sales: parseInt(e.target.value) || 0 })}
                            disabled={savingGoals}
                            className="w-full border border-[#E5E5E5] px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#737373] mb-1">Loser Min Spend</label>
                          <input
                            type="number"
                            value={goals.loser_min_spend}
                            onChange={(e) => updateGoals({ loser_min_spend: parseFloat(e.target.value) || 0 })}
                            disabled={savingGoals}
                            className="w-full border border-[#E5E5E5] px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-[#A3A3A3]">
                        Thresholds used to classify ads as super winner, winner, promising, or loser.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Model Configuration */}
          {modelSettings && (
            <div className="border border-[#E5E5E5] p-4">
              <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide mb-4">
                AI Model Configuration
              </h3>

              <div className="space-y-4">
                {Object.entries(TASK_LABELS).map(([task, config]) => {
                  const Icon = config.icon
                  const availableModels = modelSettings.available_models[task] || []
                  const currentModel = modelSettings.current_models[task]

                  return (
                    <div key={task} className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-[#737373] mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">{config.label}</span>
                          <p className="text-xs text-[#A3A3A3] mt-0.5">{config.description}</p>
                        </div>
                      </div>
                      <select
                        value={currentModel || ''}
                        onChange={(e) => updateModel(task, e.target.value)}
                        disabled={savingModel === task}
                        className={`text-sm border border-[#E5E5E5] px-2 py-1 bg-white focus:outline-none focus:border-black min-w-[200px] ${
                          savingModel === task ? 'opacity-50' : ''
                        }`}
                      >
                        {availableModels.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-[#A3A3A3] mt-4">
                Different models have different capabilities and costs. Models marked "(Thinking)" use extended thinking for better reasoning.
              </p>

              {/* Thinking Budget Slider */}
              {thinkingSettings && (
                <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">Thinking Budget</span>
                      <p className="text-xs text-[#A3A3A3] mt-0.5">
                        Token budget for extended thinking (only applies to Thinking models)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono">{localThinkingBudget.toLocaleString()}</span>
                      <span className="text-xs text-[#A3A3A3] ml-1">tokens</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#A3A3A3]">1K</span>
                    <input
                      type="range"
                      min={thinkingSettings.min_budget}
                      max={thinkingSettings.max_budget}
                      step={1000}
                      value={localThinkingBudget}
                      onChange={(e) => setLocalThinkingBudget(parseInt(e.target.value))}
                      onMouseUp={() => updateThinkingBudget(localThinkingBudget)}
                      onTouchEnd={() => updateThinkingBudget(localThinkingBudget)}
                      className="flex-1 h-2 bg-[#E5E5E5] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black"
                    />
                    <span className="text-xs text-[#A3A3A3]">128K</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[#A3A3A3]">
                      Higher budget = more reasoning = better quality but slower & more expensive
                    </span>
                    {savingThinking && <span className="text-xs text-[#A3A3A3]">Saving...</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Facebook Integration */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
              Facebook Ads Integration
            </h3>
            <FacebookConnect />
            <UrlTagsField />
          </div>

          {/* Ad Copy Formats */}
          <FormatsSection />

          {/* Copywriting Principles */}
          <div className="border border-[#E5E5E5] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#737373]" />
                <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                  Copywriting Principles
                </h3>
              </div>
              <button
                onClick={() => setShowPrinciples(!showPrinciples)}
                className="text-xs text-[#737373] hover:text-black"
              >
                {showPrinciples ? '− Hide' : '+ Edit'}
              </button>
            </div>

            <p className="text-xs text-[#A3A3A3] mb-3">
              These principles guide AI-generated ad copy. Edit to match your brand voice and proven frameworks.
            </p>

            {showPrinciples && (
              <div className="space-y-3">
                <textarea
                  value={copywritingPrinciples}
                  onChange={(e) => setCopywritingPrinciples(e.target.value)}
                  className="w-full h-96 p-3 border border-[#E5E5E5] text-sm font-mono resize-none focus:outline-none focus:border-black"
                  placeholder="Enter your copywriting principles..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A3A3A3]">
                    {copywritingPrinciples !== originalPrinciples ? 'Unsaved changes' : 'No changes'}
                  </span>
                  <Button
                    size="sm"
                    onClick={savePrinciples}
                    disabled={copywritingPrinciples === originalPrinciples || savingPrinciples}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {savingPrinciples ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Autonomous Mode */}
          <div className="border border-[#E5E5E5] p-4">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Autonomous Mode
            </h3>
            <AutonomousSettings />
          </div>

          {/* Advanced AI Customization */}
          <AdvancedSettings />

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
