import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Plus, X, Link, Trash2, ExternalLink, Tag, Copy, Check, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'

import { API_BASE } from '../config'

interface Swipe {
  id: string
  name: string
  swipe_type: 'ad_text' | 'ad_image' | 'ad_video' | 'landing_page'
  reference_code: string
  transcript?: string
  visual_description?: string
  source_url?: string
  source_platform?: string
  thumbnail_url?: string
  tags?: string[]
  category?: string
  times_referenced: number
  created_at: string
  metadata?: {
    status?: 'processing' | 'ready' | 'failed'
    error?: string
    [key: string]: unknown
  }
}

interface ProcessingProgress {
  percent: number
  message: string
}

// Helper to get status from swipe (from metadata)
const getSwipeStatus = (swipe: Swipe): 'processing' | 'ready' | 'failed' => {
  return swipe.metadata?.status || 'ready'
}

interface SwipePreview {
  success: boolean
  swipe_type: string
  name: string
  transcript: string
  visual_description?: string
  thumbnail_url?: string
  source_platform: string
  metadata?: Record<string, any>
  sections?: Array<{ type: string; content: string }>
  error?: string
}

type SwipeTypeFilter = 'all' | 'ad_text' | 'ad_image' | 'ad_video' | 'landing_page'

export function SwipeFile() {
  const [swipes, setSwipes] = useState<Swipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<SwipeTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const toast = useToast()

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Legacy preview flow (keeping for now)
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<SwipePreview | null>(null)

  // Save form state
  const [saveName, setSaveName] = useState('')
  const [saveTags, setSaveTags] = useState<string[]>([])
  const [saveCategory, setSaveCategory] = useState<string>('')
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Detail modal state
  const [selectedSwipe, setSelectedSwipe] = useState<Swipe | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Progress tracking for processing swipes
  const [progressMap, setProgressMap] = useState<Record<string, ProcessingProgress>>({})

  // Polling for processing swipes
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const prevProcessingIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchSwipes()
  }, [typeFilter])

  // Fetch status for a single processing swipe
  const fetchSwipeStatus = async (swipeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/swipes/${swipeId}/status`)
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch (error) {
      console.error(`Failed to fetch status for ${swipeId}:`, error)
    }
    return null
  }

  // Track processing swipe IDs in a ref to avoid stale closure
  const processingIdsRef = useRef<string[]>([])

  // Update processing IDs ref when swipes change
  useEffect(() => {
    const processingSwipes = swipes.filter(s => getSwipeStatus(s) === 'processing')
    const currentIds = new Set(processingSwipes.map(s => s.id))

    // Check if any previously processing swipes are now ready
    prevProcessingIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) {
        const swipe = swipes.find(s => s.id === id)
        if (swipe) {
          const status = getSwipeStatus(swipe)
          if (status === 'ready') {
            toast.success(`${swipe.reference_code} ready`, {
              label: 'View',
              onClick: () => setSelectedSwipe(swipe)
            })
            // Clean up progress entry
            setProgressMap(prev => {
              const next = { ...prev }
              delete next[id]
              return next
            })
          } else if (status === 'failed') {
            toast.error(`${swipe.reference_code} failed to process`)
            setProgressMap(prev => {
              const next = { ...prev }
              delete next[id]
              return next
            })
          }
        }
      }
    })

    prevProcessingIdsRef.current = currentIds
    processingIdsRef.current = processingSwipes.map(s => s.id)
  }, [swipes])

  // Separate effect for polling to avoid recreating interval
  useEffect(() => {
    const pollStatus = async () => {
      const ids = processingIdsRef.current
      if (ids.length === 0) return

      let anyComplete = false

      for (const id of ids) {
        const status = await fetchSwipeStatus(id)
        if (status) {
          if (status.status === 'processing') {
            // Update progress
            setProgressMap(prev => ({
              ...prev,
              [id]: {
                percent: status.percent || 0,
                message: status.progress || 'Processing...'
              }
            }))
          } else {
            // Status changed - refresh full list
            anyComplete = true
          }
        }
      }

      if (anyComplete) {
        fetchSwipes()
      }
    }

    // Start polling immediately
    pollStatus()

    // Then poll every 1.5s
    const interval = setInterval(pollStatus, 1500)

    return () => clearInterval(interval)
  }, []) // Empty deps - runs once, uses refs for current data

  const fetchSwipes = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') {
        params.set('swipe_type', typeFilter)
      }
      params.set('limit', '100')

      const res = await fetch(`${API_BASE}/swipes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSwipes(data.swipes || [])
      }
    } catch (error) {
      console.error('Failed to fetch swipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessUrl = async () => {
    if (!urlInput.trim()) return

    setIsProcessing(true)
    setPreview(null)

    try {
      const res = await fetch(`${API_BASE}/swipes/from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })

      const data = await res.json()
      setPreview(data)
      if (data.success) {
        setSaveName(data.name || '')
      }
    } catch (error) {
      console.error('Failed to process URL:', error)
      setPreview({
        success: false,
        swipe_type: 'unknown',
        name: '',
        transcript: '',
        source_platform: 'unknown',
        error: 'Failed to process URL',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // New async queue flow - instant feedback
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/swipes/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          tags: saveTags.length > 0 ? saveTags : undefined,
          category: saveCategory || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Close modal immediately
        setAddModalOpen(false)
        resetAddForm()

        // Show success toast
        toast.success(`Added ${data.reference_code} - processing in background`)

        // Refresh list to show processing item
        fetchSwipes()
      } else {
        toast.error(data.detail || 'Failed to queue URL')
      }
    } catch (error) {
      console.error('Failed to queue URL:', error)
      toast.error('Failed to add URL. Check the URL and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async () => {
    if (!preview?.success || !saveName.trim()) return

    setIsSaving(true)
    try {
      const res = await fetch(`${API_BASE}/swipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          swipe_type: preview.swipe_type,
          transcript: preview.transcript,
          visual_description: preview.visual_description,
          source_url: urlInput.trim(),
          source_platform: preview.source_platform,
          thumbnail_url: preview.thumbnail_url,
          metadata: preview.metadata,
          sections: preview.sections,
          tags: saveTags,
          category: saveCategory || null,
        }),
      })

      if (res.ok) {
        setAddModalOpen(false)
        resetAddForm()
        fetchSwipes()
      }
    } catch (error) {
      console.error('Failed to save swipe:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/swipes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedSwipe(null)
        fetchSwipes()
      }
    } catch (error) {
      console.error('Failed to delete swipe:', error)
    }
  }

  const resetAddForm = () => {
    setUrlInput('')
    setPreview(null)
    setSaveName('')
    setSaveTags([])
    setSaveCategory('')
    setTagInput('')
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !saveTags.includes(tag)) {
      setSaveTags([...saveTags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setSaveTags(saveTags.filter(t => t !== tag))
  }

  const copyReferenceCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ad_text': return 'Text Ad'
      case 'ad_image': return 'Image Ad'
      case 'ad_video': return 'Video Ad'
      case 'landing_page': return 'Landing Page'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ad_text': return 'bg-blue-100 text-blue-800'
      case 'ad_image': return 'bg-green-100 text-green-800'
      case 'ad_video': return 'bg-purple-100 text-purple-800'
      case 'landing_page': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSwipes = swipes.filter(swipe => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        swipe.name.toLowerCase().includes(query) ||
        swipe.reference_code.toLowerCase().includes(query) ||
        swipe.tags?.some(t => t.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Swipe File</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchSwipes}
              className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add from URL
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-1">
            {(['all', 'ad_text', 'ad_image', 'ad_video', 'landing_page'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === type
                    ? 'bg-black text-white'
                    : 'bg-[#F5F5F5] text-[#737373] hover:bg-[#E5E5E5]'
                }`}
              >
                {type === 'all' ? 'All' : getTypeLabel(type)}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search swipes..."
            className="flex-1 h-8 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
          />
        </div>

        {/* Info */}
        <p className="text-xs text-[#A3A3A3]">
          Reference swipes in chat: "create ad like SW001" or "use the hook style from SW003"
        </p>

        {/* Swipes Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-[#A3A3A3]">Loading...</div>
        ) : filteredSwipes.length === 0 ? (
          <div className="border border-[#E5E5E5] p-12 text-center">
            <p className="text-sm text-[#A3A3A3]">No swipes yet</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Add inspiration from URLs (Facebook posts, landing pages)</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredSwipes.map(swipe => {
              const status = getSwipeStatus(swipe)
              return (
                <div
                  key={swipe.id}
                  onClick={() => status !== 'processing' && setSelectedSwipe(swipe)}
                  className={`border transition-colors ${
                    status === 'processing'
                      ? 'border-[#E5E5E5] opacity-75 cursor-default'
                      : status === 'failed'
                      ? 'border-red-200 cursor-pointer hover:border-red-300'
                      : 'border-[#E5E5E5] hover:border-[#D4D4D4] cursor-pointer'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-[#F5F5F5] relative overflow-hidden">
                    {status === 'processing' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#737373] gap-3 px-4">
                        {/* Progress percentage */}
                        <span className="text-2xl font-bold tabular-nums">
                          {progressMap[swipe.id]?.percent || 0}%
                        </span>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-[#E5E5E5] overflow-hidden">
                          <div
                            className="h-full bg-black transition-all duration-500 ease-out"
                            style={{ width: `${progressMap[swipe.id]?.percent || 0}%` }}
                          />
                        </div>

                        {/* Status message */}
                        <span className="text-xs text-[#A3A3A3] text-center truncate w-full">
                          {progressMap[swipe.id]?.message || 'Starting...'}
                        </span>
                      </div>
                    ) : status === 'failed' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-red-400 gap-2">
                        <X className="w-6 h-6" />
                        <span className="text-xs">Failed</span>
                      </div>
                    ) : swipe.thumbnail_url ? (
                      <img
                        src={swipe.thumbnail_url}
                        alt={swipe.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#A3A3A3]">
                        <span className="text-2xl font-bold">{swipe.reference_code}</span>
                      </div>
                    )}
                    {status !== 'processing' && (
                      <span className={`absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium ${getTypeColor(swipe.swipe_type)}`}>
                        {getTypeLabel(swipe.swipe_type)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-mono font-bold text-[#737373]">{swipe.reference_code}</span>
                      {status !== 'processing' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyReferenceCode(swipe.reference_code)
                          }}
                          className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
                        >
                          {copiedCode === swipe.reference_code ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{swipe.name}</p>
                    {swipe.tags && swipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {swipe.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-[#F5F5F5] text-[#737373]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal - Simplified async flow */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Add to Swipe File</h3>
              <button
                onClick={() => {
                  setAddModalOpen(false)
                  resetAddForm()
                }}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">URL</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleAddUrl()}
                    placeholder="Paste Facebook post or landing page URL..."
                    className="w-full h-10 pl-10 pr-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Landing pages, Facebook posts, any public web page
                </p>
              </div>

              {/* Optional: Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#737373]">Tags (optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {saveTags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-[#F5F5F5] text-xs"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="winner, competitor, hook..."
                    className="flex-1 h-8 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                  />
                  <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                    <Tag className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAddModalOpen(false)
                    resetAddForm()
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSwipe && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-lg">{selectedSwipe.reference_code}</span>
                <span className={`px-2 py-1 text-xs font-medium ${getTypeColor(selectedSwipe.swipe_type)}`}>
                  {getTypeLabel(selectedSwipe.swipe_type)}
                </span>
              </div>
              <button
                onClick={() => setSelectedSwipe(null)}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Thumbnail */}
              {selectedSwipe.thumbnail_url && (
                <div className="aspect-video max-h-64 bg-[#F5F5F5] overflow-hidden">
                  <img
                    src={selectedSwipe.thumbnail_url}
                    alt={selectedSwipe.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Name */}
              <h3 className="font-medium text-lg">{selectedSwipe.name}</h3>

              {/* Source URL */}
              {selectedSwipe.source_url && (
                <a
                  href={selectedSwipe.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#737373] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {selectedSwipe.source_url}
                </a>
              )}

              {/* Tags */}
              {selectedSwipe.tags && selectedSwipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSwipe.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs bg-[#F5F5F5] text-[#737373]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Transcript */}
              {selectedSwipe.transcript && (
                <div>
                  <span className="text-xs font-medium text-[#737373] uppercase">Full Transcript</span>
                  <div className="mt-2 p-4 bg-[#FAFAFA] border border-[#E5E5E5] max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedSwipe.transcript}
                    </pre>
                  </div>
                </div>
              )}

              {/* Visual Description */}
              {selectedSwipe.visual_description && (
                <div>
                  <span className="text-xs font-medium text-[#737373] uppercase">Visual Description</span>
                  <p className="mt-1 text-sm">{selectedSwipe.visual_description}</p>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-[#A3A3A3] pt-4 border-t border-[#E5E5E5]">
                <span>Referenced {selectedSwipe.times_referenced} times</span>
                <span>Added {new Date(selectedSwipe.created_at).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyReferenceCode(selectedSwipe.reference_code)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                  onClick={() => handleDelete(selectedSwipe.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
