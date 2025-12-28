import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Plus, X, Link, Trash2, ExternalLink, Tag, Copy, Check, Loader2, FileText, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'

import { API_BASE, WS_BASE } from '../config'

interface Swipe {
  id: string
  name: string
  swipe_type: 'ad_text' | 'ad_image' | 'ad_video' | 'landing_page' | 'raw_text'
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

interface Job {
  id: string
  status: 'queued' | 'processing' | 'done' | 'failed'
  progress: number
  progress_message: string
  input_type: string
  input_data: {
    url?: string
    text?: string
    filename?: string
  }
  result_swipe_id?: string
  error_message?: string
  created_at: string
}

type SwipeTypeFilter = 'all' | 'ad_text' | 'ad_image' | 'ad_video' | 'landing_page' | 'raw_text'
type AddMode = 'url' | 'text' | 'file'

export function SwipeFile() {
  const [swipes, setSwipes] = useState<Swipe[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<SwipeTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const toast = useToast()

  // Add modal state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('url')
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Save form state (for tags/category in add modal)
  const [saveTags, setSaveTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Detail modal state
  const [selectedSwipe, setSelectedSwipe] = useState<Swipe | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}/swipes/ws`)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'initial_state') {
          setJobs(data.jobs.filter((j: Job) => j.status === 'queued' || j.status === 'processing'))
        } else if (data.type === 'job_update') {
          // Update job progress
          setJobs(prev => {
            const exists = prev.find(j => j.id === data.job_id)
            if (exists) {
              return prev.map(j =>
                j.id === data.job_id
                  ? { ...j, progress: data.progress, progress_message: data.message, status: data.status }
                  : j
              )
            }
            return prev
          })

          // If job completed, refresh swipes list and show toast
          if (data.status === 'done') {
            fetchSwipes()
            toast.success(`Swipe ready!`)
            // Remove from jobs list after delay
            setTimeout(() => {
              setJobs(prev => prev.filter(j => j.id !== data.job_id))
            }, 2000)
          } else if (data.status === 'failed') {
            toast.error(`Processing failed: ${data.message}`)
            setTimeout(() => {
              setJobs(prev => prev.filter(j => j.id !== data.job_id))
            }, 5000)
          }
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch (e) {
        console.error('WebSocket message error:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...')
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    wsRef.current = ws
  }, [toast])

  // Cleanup WebSocket on unmount
  useEffect(() => {
    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [connectWebSocket])

  useEffect(() => {
    fetchSwipes()
    fetchJobs()
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

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/swipes/jobs?limit=20`)
      if (res.ok) {
        const data = await res.json()
        // Only keep active jobs
        setJobs(data.jobs.filter((j: Job) => j.status === 'queued' || j.status === 'processing'))
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    }
  }

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/swipes/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: 'url',
          url: urlInput.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setAddModalOpen(false)
        resetAddForm()
        toast.success('Processing started...')
        // Add to local jobs for immediate feedback
        setJobs(prev => [{
          id: data.job_id,
          status: 'queued',
          progress: 0,
          progress_message: 'Queued...',
          input_type: 'url',
          input_data: { url: urlInput.trim() },
          created_at: new Date().toISOString()
        }, ...prev])
      } else {
        toast.error(data.detail || 'Failed to queue URL')
      }
    } catch (error) {
      console.error('Failed to queue URL:', error)
      toast.error('Failed to add URL')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddText = async () => {
    if (!textInput.trim()) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE}/swipes/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: 'text',
          text: textInput.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        setAddModalOpen(false)
        resetAddForm()
        toast.success('Processing text...')
        setJobs(prev => [{
          id: data.job_id,
          status: 'queued',
          progress: 0,
          progress_message: 'Queued...',
          input_type: 'text',
          input_data: { text: textInput.trim().substring(0, 50) + '...' },
          created_at: new Date().toISOString()
        }, ...prev])
      } else {
        toast.error(data.detail || 'Failed to queue text')
      }
    } catch (error) {
      console.error('Failed to queue text:', error)
      toast.error('Failed to add text')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/swipes/jobs/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setAddModalOpen(false)
        resetAddForm()
        toast.success(`Processing ${file.name}...`)
        setJobs(prev => [{
          id: data.job_id,
          status: 'queued',
          progress: 0,
          progress_message: 'Queued...',
          input_type: 'file',
          input_data: { filename: file.name },
          created_at: new Date().toISOString()
        }, ...prev])
      } else {
        toast.error(data.detail || 'Failed to upload file')
      }
    } catch (error) {
      console.error('Failed to upload file:', error)
      toast.error('Failed to upload file')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/swipes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedSwipe(null)
        fetchSwipes()
        toast.success('Deleted')
      }
    } catch (error) {
      console.error('Failed to delete swipe:', error)
    }
  }

  const resetAddForm = () => {
    setUrlInput('')
    setTextInput('')
    setSaveTags([])
    setTagInput('')
    setAddMode('url')
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
      case 'raw_text': return 'Text'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ad_text': return 'bg-blue-100 text-blue-800'
      case 'ad_image': return 'bg-green-100 text-green-800'
      case 'ad_video': return 'bg-purple-100 text-purple-800'
      case 'landing_page': return 'bg-orange-100 text-orange-800'
      case 'raw_text': return 'bg-gray-100 text-gray-800'
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
              onClick={() => { fetchSwipes(); fetchJobs() }}
              className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-1">
            {(['all', 'ad_text', 'ad_image', 'ad_video', 'landing_page', 'raw_text'] as const).map(type => (
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

        {/* Processing Jobs */}
        {jobs.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#737373] uppercase">Processing</span>
            <div className="space-y-2">
              {jobs.map(job => (
                <div key={job.id} className="border border-[#E5E5E5] p-3 bg-[#FAFAFA]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {job.input_type === 'url' && job.input_data.url}
                      {job.input_type === 'text' && job.input_data.text}
                      {job.input_type === 'file' && job.input_data.filename}
                    </span>
                    <span className="text-xs text-[#737373]">{job.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E5E5E5] overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-500 ease-out"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#A3A3A3] mt-1 block">
                    {job.progress_message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Swipes Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-[#A3A3A3]">Loading...</div>
        ) : filteredSwipes.length === 0 ? (
          <div className="border border-[#E5E5E5] p-12 text-center">
            <p className="text-sm text-[#A3A3A3]">No swipes yet</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Add inspiration from URLs, files, or text</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredSwipes.map(swipe => (
              <div
                key={swipe.id}
                onClick={() => setSelectedSwipe(swipe)}
                className="border border-[#E5E5E5] hover:border-[#D4D4D4] cursor-pointer transition-colors"
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
              {/* Mode Selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAddMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border transition-colors ${
                    addMode === 'url'
                      ? 'border-black bg-black text-white'
                      : 'border-[#E5E5E5] text-[#737373] hover:border-[#D4D4D4]'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  URL
                </button>
                <button
                  onClick={() => setAddMode('text')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border transition-colors ${
                    addMode === 'text'
                      ? 'border-black bg-black text-white'
                      : 'border-[#E5E5E5] text-[#737373] hover:border-[#D4D4D4]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Text
                </button>
                <button
                  onClick={() => setAddMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border transition-colors ${
                    addMode === 'file'
                      ? 'border-black bg-black text-white'
                      : 'border-[#E5E5E5] text-[#737373] hover:border-[#D4D4D4]'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  File
                </button>
              </div>

              {/* URL Input */}
              {addMode === 'url' && (
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
                    Facebook posts, landing pages, any public URL
                  </p>
                </div>
              )}

              {/* Text Input */}
              {addMode === 'text' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Text</label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste ad copy, landing page text, or any content..."
                    className="w-full h-32 p-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black resize-none"
                    autoFocus
                  />
                  <p className="text-xs text-[#A3A3A3]">
                    Paste any text - Gemini will analyze and tag it automatically
                  </p>
                </div>
              )}

              {/* File Upload */}
              {addMode === 'file' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">File</label>
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#E5E5E5] hover:border-[#D4D4D4] cursor-pointer transition-colors">
                    <Upload className="w-8 h-8 text-[#A3A3A3] mb-2" />
                    <span className="text-sm text-[#737373]">Click to upload</span>
                    <span className="text-xs text-[#A3A3A3]">Images, videos, PDFs, text files</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,.pdf,.txt,.md"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}

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
              {addMode !== 'file' && (
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
                    onClick={addMode === 'url' ? handleAddUrl : handleAddText}
                    disabled={(addMode === 'url' ? !urlInput.trim() : !textInput.trim()) || isSubmitting}
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
              )}
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
