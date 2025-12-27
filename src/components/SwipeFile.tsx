import { useState, useEffect } from 'react'
import { RefreshCw, Plus, X, Link, Trash2, ExternalLink, Tag, Copy, Check } from 'lucide-react'
import { Button } from './ui/button'

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

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
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

  useEffect(() => {
    fetchSwipes()
  }, [typeFilter])

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
            {filteredSwipes.map(swipe => (
              <div
                key={swipe.id}
                onClick={() => setSelectedSwipe(swipe)}
                className="border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-[#F5F5F5] relative overflow-hidden">
                  {swipe.thumbnail_url ? (
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
                  <span className={`absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium ${getTypeColor(swipe.swipe_type)}`}>
                    {getTypeLabel(swipe.swipe_type)}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-mono font-bold text-[#737373]">{swipe.reference_code}</span>
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
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
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
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste Facebook post or landing page URL..."
                      className="w-full h-10 pl-10 pr-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                    />
                  </div>
                  <Button
                    onClick={handleProcessUrl}
                    disabled={!urlInput.trim() || isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Fetch'}
                  </Button>
                </div>
                <p className="text-xs text-[#A3A3A3]">
                  Supported: Facebook posts, landing pages, any public web page
                </p>
              </div>

              {/* Preview */}
              {preview && (
                <div className="border border-[#E5E5E5] p-4 space-y-4">
                  {preview.success ? (
                    <>
                      {/* Thumbnail */}
                      {preview.thumbnail_url && (
                        <div className="aspect-video max-h-48 bg-[#F5F5F5] overflow-hidden">
                          <img
                            src={preview.thumbnail_url}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium ${getTypeColor(preview.swipe_type)}`}>
                          {getTypeLabel(preview.swipe_type)}
                        </span>
                        <span className="text-xs text-[#737373]">
                          from {preview.source_platform}
                        </span>
                      </div>

                      {/* Transcript Preview */}
                      <div>
                        <span className="text-xs font-medium text-[#737373] uppercase">Transcript</span>
                        <div className="mt-1 p-3 bg-[#FAFAFA] border border-[#E5E5E5] max-h-48 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap font-sans">
                            {preview.transcript.slice(0, 1000)}
                            {preview.transcript.length > 1000 && '...'}
                          </pre>
                        </div>
                        <p className="text-xs text-[#A3A3A3] mt-1">
                          {preview.transcript.length.toLocaleString()} characters
                        </p>
                      </div>

                      {/* Save Form */}
                      <div className="border-t border-[#E5E5E5] pt-4 space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Name</label>
                          <input
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tags</label>
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
                              placeholder="Add tag..."
                              className="flex-1 h-8 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                            />
                            <Button variant="outline" size="sm" onClick={addTag}>
                              <Tag className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Category</label>
                          <select
                            value={saveCategory}
                            onChange={(e) => setSaveCategory(e.target.value)}
                            className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
                          >
                            <option value="">None</option>
                            <option value="inspiration">Inspiration</option>
                            <option value="competitor">Competitor</option>
                            <option value="internal_winner">Internal Winner</option>
                            <option value="reference">Reference</option>
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-600">{preview.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAddModalOpen(false)
                    resetAddForm()
                  }}
                >
                  Cancel
                </Button>
                {preview?.success && (
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={!saveName.trim() || isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save to Swipe File'}
                  </Button>
                )}
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
