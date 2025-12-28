import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  X,
  Wand2,
  FileText,
  BarChart2,
  Eye,
  Settings2,
} from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface PromptCustomization {
  key: string
  name: string
  description: string
  category: string
  value: string
  is_default: boolean
}

interface StylePreset {
  id: string
  name: string
  description: string
  template: string
  is_custom: boolean
  is_default: boolean
}

// API functions
async function fetchPrompts(): Promise<PromptCustomization[]> {
  const res = await authFetch(`${API_BASE}/settings/prompts`)
  if (!res.ok) throw new Error('Failed to fetch prompts')
  const data = await res.json()
  return data.prompts
}

async function fetchStylePresets(): Promise<StylePreset[]> {
  const res = await authFetch(`${API_BASE}/settings/style-presets`)
  if (!res.ok) throw new Error('Failed to fetch style presets')
  const data = await res.json()
  return data.presets
}

async function updatePrompt(key: string, value: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/prompts/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error('Failed to update prompt')
}

async function resetPrompt(key: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/prompts/${key}/reset`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to reset prompt')
}

async function updateStylePreset(
  id: string,
  data: Partial<StylePreset>
): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/style-presets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update preset')
}

async function createStylePreset(data: {
  id: string
  name: string
  description: string
  template: string
}): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/style-presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create preset')
}

async function deleteStylePreset(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/style-presets/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete preset')
}

async function resetStylePreset(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/style-presets/${id}/reset`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to reset preset')
}

async function resetAllStylePresets(): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/style-presets/reset-all`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to reset all presets')
}

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  copy: <FileText className="w-4 h-4" />,
  analysis: <BarChart2 className="w-4 h-4" />,
  visual: <Eye className="w-4 h-4" />,
  other: <Settings2 className="w-4 h-4" />,
}

// Editor Modal Component
function EditorModal({
  title,
  description,
  value,
  onSave,
  onReset,
  onClose,
  isLoading,
  canReset,
}: {
  title: string
  description: string
  value: string
  onSave: (value: string) => void
  onReset?: () => void
  onClose: () => void
  isLoading: boolean
  canReset: boolean
}) {
  const [editValue, setEditValue] = useState(value)
  const charCount = editValue.length
  const tokenEstimate = Math.ceil(charCount / 4)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-[#737373] mt-0.5">{description}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F5F5] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto p-4">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full h-[400px] p-3 text-sm font-mono border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
            placeholder="Enter prompt text..."
          />
          <div className="mt-2 text-xs text-[#A3A3A3]">
            {charCount.toLocaleString()} characters | ~{tokenEstimate.toLocaleString()} tokens
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] flex items-center justify-between">
          <div>
            {canReset && onReset && (
              <Button variant="outline" size="sm" onClick={onReset} disabled={isLoading}>
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to Default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={() => onSave(editValue)} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Style Preset Card Component
function StylePresetCard({
  preset,
  onEdit,
  onDelete,
  onReset,
}: {
  preset: StylePreset
  onEdit: () => void
  onDelete: () => void
  onReset: () => void
}) {
  return (
    <div className="border border-[#E5E5E5] rounded p-3 hover:border-[#A3A3A3] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{preset.name}</h4>
            {preset.is_custom && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                Custom
              </span>
            )}
            {!preset.is_default && !preset.is_custom && (
              <span className="px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded">
                Modified
              </span>
            )}
          </div>
          <p className="text-xs text-[#737373] mt-0.5 line-clamp-2">
            {preset.description}
          </p>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        <button
          onClick={onEdit}
          className="flex-1 px-2 py-1 text-xs bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded transition-colors"
        >
          Edit
        </button>
        {!preset.is_default && !preset.is_custom && (
          <button
            onClick={onReset}
            className="px-2 py-1 text-xs text-[#737373] hover:bg-[#F5F5F5] rounded transition-colors"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        {preset.is_custom && (
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete preset"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// Main Component
export function AdvancedSettings() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<PromptCustomization | null>(null)
  const [editingPreset, setEditingPreset] = useState<StylePreset | null>(null)
  const [isCreatingPreset, setIsCreatingPreset] = useState(false)
  const [newPreset, setNewPreset] = useState({
    id: '',
    name: '',
    description: '',
    template: '',
  })

  // Queries
  const { data: prompts = [], isLoading: loadingPrompts } = useQuery({
    queryKey: ['prompts'],
    queryFn: fetchPrompts,
    enabled: isExpanded,
  })

  const { data: presets = [], isLoading: loadingPresets } = useQuery({
    queryKey: ['style-presets'],
    queryFn: fetchStylePresets,
    enabled: isExpanded,
  })

  // Mutations
  const updatePromptMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updatePrompt(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Prompt updated')
      setEditingPrompt(null)
    },
    onError: () => toast.error('Failed to update prompt'),
  })

  const resetPromptMutation = useMutation({
    mutationFn: resetPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      toast.success('Prompt reset to default')
      setEditingPrompt(null)
    },
    onError: () => toast.error('Failed to reset prompt'),
  })

  const updatePresetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StylePreset> }) =>
      updateStylePreset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] })
      toast.success('Preset updated')
      setEditingPreset(null)
    },
    onError: () => toast.error('Failed to update preset'),
  })

  const createPresetMutation = useMutation({
    mutationFn: createStylePreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] })
      toast.success('Preset created')
      setIsCreatingPreset(false)
      setNewPreset({ id: '', name: '', description: '', template: '' })
    },
    onError: () => toast.error('Failed to create preset'),
  })

  const deletePresetMutation = useMutation({
    mutationFn: deleteStylePreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] })
      toast.success('Preset deleted')
    },
    onError: () => toast.error('Failed to delete preset'),
  })

  const resetPresetMutation = useMutation({
    mutationFn: resetStylePreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] })
      toast.success('Preset reset to default')
    },
    onError: () => toast.error('Failed to reset preset'),
  })

  const resetAllPresetsMutation = useMutation({
    mutationFn: resetAllStylePresets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] })
      toast.success('All presets reset to defaults')
    },
    onError: () => toast.error('Failed to reset presets'),
  })

  // Group prompts by category
  const promptsByCategory = prompts.reduce(
    (acc, prompt) => {
      const cat = prompt.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(prompt)
      return acc
    },
    {} as Record<string, PromptCustomization[]>
  )

  const categoryNames: Record<string, string> = {
    copy: 'Copy Generation',
    analysis: 'Analysis & Learning',
    visual: 'Visual Analysis',
    other: 'Other',
  }

  return (
    <div className="border border-[#E5E5E5] rounded">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[#737373]" />
          <span className="text-xs font-medium text-[#737373] uppercase tracking-wide">
            Advanced AI Customization
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#737373]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#737373]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-[#E5E5E5] p-4 space-y-6">
          {/* Style Presets Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Image Style Presets</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingPreset(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Preset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetAllPresetsMutation.mutate()}
                  disabled={resetAllPresetsMutation.isPending}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset All
                </Button>
              </div>
            </div>

            {loadingPresets ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {presets.map((preset) => (
                  <StylePresetCard
                    key={preset.id}
                    preset={preset}
                    onEdit={() => setEditingPreset(preset)}
                    onDelete={() => {
                      if (confirm(`Delete preset "${preset.name}"?`)) {
                        deletePresetMutation.mutate(preset.id)
                      }
                    }}
                    onReset={() => resetPresetMutation.mutate(preset.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* AI Prompts Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">AI Prompts</h3>

            {loadingPrompts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      {categoryIcons[category]}
                      <h4 className="text-xs font-medium text-[#737373] uppercase">
                        {categoryNames[category] || category}
                      </h4>
                    </div>
                    <div className="space-y-1">
                      {categoryPrompts.map((prompt) => (
                        <div
                          key={prompt.key}
                          className="flex items-center justify-between p-2 rounded hover:bg-[#F5F5F5] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{prompt.name}</span>
                              {!prompt.is_default && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded">
                                  Modified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#A3A3A3] truncate">
                              {prompt.description}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPrompt(prompt)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompt Editor Modal */}
      {editingPrompt && (
        <EditorModal
          title={editingPrompt.name}
          description={editingPrompt.description}
          value={editingPrompt.value}
          onSave={(value) =>
            updatePromptMutation.mutate({ key: editingPrompt.key, value })
          }
          onReset={() => resetPromptMutation.mutate(editingPrompt.key)}
          onClose={() => setEditingPrompt(null)}
          isLoading={updatePromptMutation.isPending || resetPromptMutation.isPending}
          canReset={!editingPrompt.is_default}
        />
      )}

      {/* Style Preset Editor Modal */}
      {editingPreset && (
        <EditorModal
          title={`Edit: ${editingPreset.name}`}
          description={editingPreset.description}
          value={editingPreset.template}
          onSave={(value) =>
            updatePresetMutation.mutate({
              id: editingPreset.id,
              data: { template: value },
            })
          }
          onReset={() => resetPresetMutation.mutate(editingPreset.id)}
          onClose={() => setEditingPreset(null)}
          isLoading={updatePresetMutation.isPending || resetPresetMutation.isPending}
          canReset={!editingPreset.is_default && !editingPreset.is_custom}
        />
      )}

      {/* Create Preset Modal */}
      {isCreatingPreset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="font-semibold">Create New Style Preset</h3>
              <button
                onClick={() => setIsCreatingPreset(false)}
                className="p-1 hover:bg-[#F5F5F5] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  ID (lowercase, no spaces)
                </label>
                <input
                  type="text"
                  value={newPreset.id}
                  onChange={(e) =>
                    setNewPreset({
                      ...newPreset,
                      id: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  className="w-full h-9 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                  placeholder="e.g., lifestyle_shot"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newPreset.name}
                  onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                  placeholder="e.g., Lifestyle Shot"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newPreset.description}
                  onChange={(e) =>
                    setNewPreset({ ...newPreset, description: e.target.value })
                  }
                  className="w-full h-9 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                  placeholder="Brief description of the style"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Template (use {'{prompt}'} as placeholder)
                </label>
                <textarea
                  value={newPreset.template}
                  onChange={(e) =>
                    setNewPreset({ ...newPreset, template: e.target.value })
                  }
                  className="w-full h-48 px-3 py-2 text-sm font-mono border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
                  placeholder="Describe the style...&#10;&#10;SCENE:&#10;{prompt}"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#E5E5E5] flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingPreset(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createPresetMutation.mutate(newPreset)}
                disabled={
                  !newPreset.id ||
                  !newPreset.name ||
                  !newPreset.template ||
                  createPresetMutation.isPending
                }
              >
                {createPresetMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Preset'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
