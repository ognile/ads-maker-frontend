import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, X, Upload, Palette, Layout, Type, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface StyleAnalysis {
  layout_type: string
  color_scheme: string
  typography_style: string
  product_placement: string
  overall_vibe: string
}

interface BOFTemplate {
  id: string
  name: string
  description: string | null
  template_url: string
  style_analysis: StyleAnalysis | null
  product_id: string | null
  is_active: boolean
  created_at: string
}

async function fetchTemplates(): Promise<BOFTemplate[]> {
  const res = await authFetch(`${API_BASE}/bof-templates`)
  if (!res.ok) throw new Error('Failed to fetch templates')
  return res.json()
}

async function createTemplate(data: { name: string; template_data: string; description?: string }): Promise<BOFTemplate> {
  const res = await authFetch(`${API_BASE}/bof-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create template')
  return res.json()
}

async function deleteTemplate(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/bof-templates/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete template')
}

export function BOFTemplates() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadData, setUploadData] = useState<string | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['bof-templates'],
    queryFn: fetchTemplates,
  })

  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bof-templates'] })
      toast.success('Template added, analyzing style...')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to add template')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bof-templates'] })
      toast.success('Template deleted')
    },
    onError: () => {
      toast.error('Failed to delete template')
    },
  })

  const closeModal = () => {
    setUploadModalOpen(false)
    setUploadName('')
    setUploadDescription('')
    setUploadPreview(null)
    setUploadData(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setUploadPreview(dataUrl)
      setUploadData(dataUrl)
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!uploadName.trim() || !uploadData) return

    createMutation.mutate({
      name: uploadName.trim(),
      template_data: uploadData,
      description: uploadDescription.trim() || undefined,
    })
  }

  const getStyleIcon = (key: string) => {
    switch (key) {
      case 'layout_type': return Layout
      case 'color_scheme': return Palette
      case 'typography_style': return Type
      case 'overall_vibe': return Sparkles
      default: return Sparkles
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#737373]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Style Templates</h4>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Upload competitor ads to inspire BOF generation style
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUploadModalOpen(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Template
        </Button>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-[#E5E5E5] overflow-hidden group"
            >
              <div className="relative aspect-square bg-[#FAFAFA]">
                <img
                  src={template.template_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => deleteMutation.mutate(template.id)}
                  disabled={deleteMutation.isPending}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3">
                <div className="font-medium text-sm truncate">{template.name}</div>

                {template.style_analysis ? (
                  <div className="mt-2 space-y-1">
                    {(['layout_type', 'overall_vibe'] as const).map((key) => {
                      const Icon = getStyleIcon(key)
                      const value = template.style_analysis?.[key]
                      if (!value) return null
                      return (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-[#737373]">
                          <Icon className="w-3 h-3" />
                          <span className="capitalize">{value}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#A3A3A3]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Analyzing style...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[#E5E5E5] p-8 text-center">
          <Palette className="w-8 h-8 text-[#D4D4D4] mx-auto mb-2" />
          <p className="text-sm text-[#737373]">No style templates yet</p>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Upload competitor ads to guide BOF image generation
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Add Style Template</h3>
              <button
                onClick={closeModal}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Image Upload */}
              <div>
                {uploadPreview ? (
                  <div className="relative aspect-square bg-[#FAFAFA] border border-[#E5E5E5]">
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setUploadPreview(null)
                        setUploadData(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border-2 border-dashed border-[#E5E5E5] hover:border-[#D4D4D4] flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-[#A3A3A3]" />
                    <span className="text-sm text-[#737373]">Click to upload image</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g., Competitor Static 01"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Description <span className="text-[#A3A3A3] font-normal">(optional)</span>
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Notes about this template style..."
                  className="w-full h-20 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!uploadName.trim() || !uploadData || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : null}
                  {createMutation.isPending ? 'Adding...' : 'Add Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
