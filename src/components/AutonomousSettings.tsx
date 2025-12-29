import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  RefreshCw,
  Zap,
  Target,
  Clock,
  Shield,
  Sparkles,
  Sliders,
  BookOpen,
} from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface AutonomousSetting {
  name: string
  description: string
  type: string
  default: unknown
  value: unknown
  category: string
  min?: number
  max?: number
  step?: number
  options?: string[]
}

interface AutonomousStatus {
  enabled: boolean
  daily_target: number
  concepts_today: number
  remaining: number
  is_running: boolean
  pending_jobs: number
  auto_approval_enabled: boolean
  diversity_enabled: boolean
}

async function fetchSettings(): Promise<Record<string, AutonomousSetting>> {
  const res = await authFetch(`${API_BASE}/settings/autonomous`)
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

async function fetchStatus(): Promise<AutonomousStatus> {
  const res = await authFetch(`${API_BASE}/settings/autonomous/status`)
  if (!res.ok) throw new Error('Failed to fetch status')
  return res.json()
}

async function updateSettings(updates: Record<string, unknown>): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/autonomous`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update settings')
}

async function triggerGeneration(): Promise<{ job_id: string }> {
  const res = await authFetch(`${API_BASE}/settings/autonomous/trigger`, {
    method: 'POST',
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.detail || 'Failed to trigger generation')
  }
  return res.json()
}

export function AutonomousSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [expandedSection, setExpandedSection] = useState<string | null>('quota')
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({})

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['autonomous-settings'],
    queryFn: fetchSettings,
  })

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['autonomous-status'],
    queryFn: fetchStatus,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autonomous-settings'] })
      queryClient.invalidateQueries({ queryKey: ['autonomous-status'] })
      toast({ title: 'Settings updated' })
      setPendingChanges({})
    },
    onError: () => {
      toast({ title: 'Failed to update settings', variant: 'destructive' })
    },
  })

  const triggerMutation = useMutation({
    mutationFn: triggerGeneration,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['autonomous-status'] })
      toast({ title: `Job queued: ${data.job_id.slice(0, 8)}...` })
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' })
    },
  })

  const getValue = (key: string) => {
    if (key in pendingChanges) return pendingChanges[key]
    return settings?.[key]?.value ?? settings?.[key]?.default
  }

  const handleChange = (key: string, value: unknown) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (Object.keys(pendingChanges).length > 0) {
      updateMutation.mutate(pendingChanges)
    }
  }

  const categories = [
    { id: 'quota', label: 'Daily Quota', icon: Target },
    { id: 'approval', label: 'Auto-Approval', icon: Shield },
    { id: 'diversity', label: 'Diversity', icon: Sparkles },
    { id: 'generation', label: 'Generation Limits', icon: Sliders },
    { id: 'learning', label: 'Learning', icon: BookOpen },
  ]

  const renderSettingInput = (key: string, setting: AutonomousSetting) => {
    const value = getValue(key)

    if (setting.type === 'boolean') {
      return (
        <button
          onClick={() => handleChange(key, !value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value ? 'bg-black' : 'bg-[#E5E5E5]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      )
    }

    if (setting.type === 'number') {
      return (
        <input
          type="number"
          value={value as number}
          onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
          min={setting.min}
          max={setting.max}
          step={setting.step || 1}
          className="w-24 px-3 py-1.5 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
        />
      )
    }

    if (setting.type === 'select') {
      return (
        <select
          value={value as string}
          onChange={(e) => handleChange(key, e.target.value)}
          className="px-3 py-1.5 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
        >
          {setting.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    }

    if (setting.type === 'string') {
      return (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => handleChange(key, e.target.value || null)}
          className="w-64 px-3 py-1.5 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
          placeholder="Not set"
        />
      )
    }

    return null
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#737373]" />
      </div>
    )
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0
  const isEnabled = getValue('autonomous_enabled') as boolean

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status?.is_running
                    ? 'bg-green-500 animate-pulse'
                    : isEnabled
                    ? 'bg-yellow-500'
                    : 'bg-[#737373]'
                }`}
              />
              <span className="text-sm">
                {status?.is_running
                  ? 'Running'
                  : isEnabled
                  ? 'Enabled'
                  : 'Disabled'}
              </span>
            </div>

            {isEnabled && status && (
              <>
                <div className="text-sm">
                  <span className="text-[#737373]">Today:</span>{' '}
                  <span className="font-medium">
                    {status.concepts_today}/{status.daily_target}
                  </span>
                </div>

                {status.pending_jobs > 0 && (
                  <div className="text-sm">
                    <span className="text-[#737373]">Pending:</span>{' '}
                    <span className="font-medium">{status.pending_jobs}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['autonomous-status'] })
              }
              disabled={statusLoading}
            >
              <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            </Button>

            {isEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending || status?.is_running}
              >
                {triggerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Generate Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 border border-[#E5E5E5]">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Autonomous Mode
          </h4>
          <p className="text-xs text-[#737373] mt-1">
            Auto-generate concepts daily with quality gates
          </p>
        </div>
        {settings?.autonomous_enabled &&
          renderSettingInput('autonomous_enabled', settings.autonomous_enabled)}
      </div>

      {/* Settings Categories */}
      {categories.map((category) => {
        const categorySettings = settings
          ? Object.entries(settings).filter(
              ([_, s]) => s.category === category.id
            )
          : []

        if (categorySettings.length === 0) return null

        const Icon = category.icon
        const isExpanded = expandedSection === category.id

        return (
          <div key={category.id} className="border border-[#E5E5E5]">
            <button
              onClick={() =>
                setExpandedSection(isExpanded ? null : category.id)
              }
              className="w-full flex items-center justify-between p-4 hover:bg-[#FAFAFA]"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#737373]" />
                <span className="font-medium">{category.label}</span>
                <span className="text-xs text-[#737373]">
                  ({categorySettings.length})
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-[#E5E5E5] divide-y divide-[#E5E5E5]">
                {categorySettings.map(([key, setting]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex-1 mr-4">
                      <div className="text-sm font-medium">{setting.name}</div>
                      <div className="text-xs text-[#737373]">
                        {setting.description}
                      </div>
                    </div>
                    {renderSettingInput(key, setting)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Save Button */}
      {hasPendingChanges && (
        <div className="sticky bottom-0 bg-white border-t border-[#E5E5E5] p-4 -mx-4 -mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#737373]">
              {Object.keys(pendingChanges).length} unsaved changes
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingChanges({})}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
