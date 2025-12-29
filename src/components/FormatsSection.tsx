import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RotateCcw,
  Loader2,
  X,
  FileText,
  Link2,
  Check,
  Search,
  Image as ImageIcon,
  Upload,
} from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface AdFormat {
  id: string
  format_id: string
  name: string
  description: string | null
  structure: string
  voice_notes: string | null
  pacing: string | null
  do_list: string[]
  dont_list: string[]
  linked_swipe_ids: string[]
  reference_image_urls: string[]
  is_active: boolean
  is_default: boolean
}

interface SwipeFile {
  id: string
  reference_code: string
  name: string
  swipe_type: string
  transcript?: string
}

// API functions
async function fetchFormats(): Promise<AdFormat[]> {
  const res = await authFetch(`${API_BASE}/settings/formats`)
  if (!res.ok) throw new Error('Failed to fetch formats')
  const data = await res.json()
  return data.formats
}

async function fetchSwipes(): Promise<SwipeFile[]> {
  const res = await authFetch(`${API_BASE}/swipes`)
  if (!res.ok) throw new Error('Failed to fetch swipes')
  const data = await res.json()
  return data.swipes || data
}

async function seedFormats(): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/formats/seed`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to seed formats')
}

async function createFormat(data: Partial<AdFormat>): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/formats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create format')
}

async function updateFormat(
  format_id: string,
  data: Partial<AdFormat>
): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/formats/${format_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update format')
}

async function deleteFormat(format_id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/formats/${format_id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete format')
}

async function resetFormat(format_id: string): Promise<void> {
  const res = await authFetch(
    `${API_BASE}/settings/formats/${format_id}/reset`,
    {
      method: 'POST',
    }
  )
  if (!res.ok) throw new Error('Failed to reset format')
}

async function resetAllFormats(): Promise<void> {
  const res = await authFetch(`${API_BASE}/settings/formats/reset-all`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Failed to reset all formats')
}

async function addReferenceImage(
  format_id: string,
  image_data: string
): Promise<{ image_url: string; reference_image_urls: string[] }> {
  const res = await authFetch(
    `${API_BASE}/settings/formats/${format_id}/add-reference-image`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_data }),
    }
  )
  if (!res.ok) throw new Error('Failed to upload image')
  return res.json()
}

async function removeReferenceImage(
  format_id: string,
  image_url: string
): Promise<{ reference_image_urls: string[] }> {
  const res = await authFetch(
    `${API_BASE}/settings/formats/${format_id}/remove-reference-image?image_url=${encodeURIComponent(image_url)}`,
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error('Failed to remove image')
  return res.json()
}

// Format Card Component
function FormatCard({
  format,
  onEdit,
  onDelete,
  onReset,
}: {
  format: AdFormat
  onEdit: () => void
  onDelete: () => void
  onReset: () => void
}) {
  return (
    <div className="border border-[#E5E5E5] rounded p-4 hover:border-[#A3A3A3] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm">{format.name}</h4>
            {format.is_default && (
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded">
                Default
              </span>
            )}
          </div>
          <p className="text-xs text-[#737373] mt-1 line-clamp-2">
            {format.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-[#A3A3A3] mb-3">
        <span className="flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          {format.linked_swipe_ids?.length || 0} swipes
        </span>
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {format.reference_image_urls?.length || 0} images
        </span>
        <span>{format.do_list?.length || 0} do's</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-xs bg-[#F5F5F5] hover:bg-[#E5E5E5] rounded transition-colors"
        >
          Edit
        </button>
        {format.is_default && (
          <button
            onClick={onReset}
            className="px-2 py-1.5 text-xs text-[#737373] hover:bg-[#F5F5F5] rounded transition-colors"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        {!format.is_default && (
          <button
            onClick={onDelete}
            className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete format"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// Swipe Selector Modal
function SwipeSelectorModal({
  linkedSwipeIds,
  onLink,
  onUnlink,
  onClose,
}: {
  linkedSwipeIds: string[]
  onLink: (id: string) => void
  onUnlink: (id: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const { data: swipes = [], isLoading } = useQuery({
    queryKey: ['swipes'],
    queryFn: fetchSwipes,
  })

  const filteredSwipes = swipes.filter(
    (swipe) =>
      swipe.name.toLowerCase().includes(search.toLowerCase()) ||
      swipe.reference_code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h3 className="font-semibold">Link Swipe Files</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#F5F5F5] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#E5E5E5]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search swipes..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
            </div>
          ) : filteredSwipes.length === 0 ? (
            <p className="text-sm text-[#A3A3A3] text-center py-8">
              No swipes found
            </p>
          ) : (
            <div className="space-y-2">
              {filteredSwipes.map((swipe) => {
                const isLinked = linkedSwipeIds.includes(swipe.id)
                return (
                  <div
                    key={swipe.id}
                    className={`flex items-center justify-between p-3 rounded border transition-colors cursor-pointer ${
                      isLinked
                        ? 'border-black bg-[#F5F5F5]'
                        : 'border-[#E5E5E5] hover:border-[#A3A3A3]'
                    }`}
                    onClick={() =>
                      isLinked ? onUnlink(swipe.id) : onLink(swipe.id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#737373]">
                          {swipe.reference_code}
                        </span>
                        <span className="text-sm truncate">{swipe.name}</span>
                      </div>
                      <p className="text-xs text-[#A3A3A3] mt-0.5">
                        {swipe.swipe_type}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isLinked
                          ? 'bg-black border-black'
                          : 'border-[#E5E5E5]'
                      }`}
                    >
                      {isLinked && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#E5E5E5] flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}

// Format Editor Modal
function FormatEditorModal({
  format,
  onSave,
  onReset,
  onClose,
  isLoading,
}: {
  format: AdFormat | null
  onSave: (data: Partial<AdFormat>) => void
  onReset?: () => void
  onClose: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    format_id: format?.format_id || '',
    name: format?.name || '',
    description: format?.description || '',
    structure: format?.structure || '',
    voice_notes: format?.voice_notes || '',
    pacing: format?.pacing || '',
    do_list: format?.do_list || [],
    dont_list: format?.dont_list || [],
    linked_swipe_ids: format?.linked_swipe_ids || [],
    reference_image_urls: format?.reference_image_urls || [],
  })
  const [newDoItem, setNewDoItem] = useState('')
  const [newDontItem, setNewDontItem] = useState('')
  const [showSwipeSelector, setShowSwipeSelector] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const isNew = !format

  // Handle image upload (file or base64)
  const handleImageUpload = useCallback(
    async (imageData: string) => {
      if (!format) return // Can't upload to unsaved format

      setIsUploadingImage(true)
      try {
        const result = await addReferenceImage(format.format_id, imageData)
        setFormData((prev) => ({
          ...prev,
          reference_image_urls: result.reference_image_urls,
        }))
        toast.success('Image uploaded')
      } catch (error) {
        toast.error('Failed to upload image')
      } finally {
        setIsUploadingImage(false)
      }
    },
    [format, toast]
  )

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return
        const reader = new FileReader()
        reader.onload = () => {
          handleImageUpload(reader.result as string)
        }
        reader.readAsDataURL(file)
      })

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleImageUpload]
  )

  // Handle paste (cmd+v)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      Array.from(items).forEach((item) => {
        if (!item.type.startsWith('image/')) return
        const file = item.getAsFile()
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => {
          handleImageUpload(reader.result as string)
        }
        reader.readAsDataURL(file)
      })
    },
    [handleImageUpload]
  )

  // Handle drag/drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer?.files
      if (!files) return

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return
        const reader = new FileReader()
        reader.onload = () => {
          handleImageUpload(reader.result as string)
        }
        reader.readAsDataURL(file)
      })
    },
    [handleImageUpload]
  )

  // Handle image removal
  const handleRemoveImage = useCallback(
    async (imageUrl: string) => {
      if (!format) return

      try {
        const result = await removeReferenceImage(format.format_id, imageUrl)
        setFormData((prev) => ({
          ...prev,
          reference_image_urls: result.reference_image_urls,
        }))
        toast.success('Image removed')
      } catch (error) {
        toast.error('Failed to remove image')
      }
    },
    [format, toast]
  )

  const handleAddDoItem = () => {
    if (newDoItem.trim()) {
      setFormData({
        ...formData,
        do_list: [...formData.do_list, newDoItem.trim()],
      })
      setNewDoItem('')
    }
  }

  const handleAddDontItem = () => {
    if (newDontItem.trim()) {
      setFormData({
        ...formData,
        dont_list: [...formData.dont_list, newDontItem.trim()],
      })
      setNewDontItem('')
    }
  }

  const handleRemoveDoItem = (index: number) => {
    setFormData({
      ...formData,
      do_list: formData.do_list.filter((_, i) => i !== index),
    })
  }

  const handleRemoveDontItem = (index: number) => {
    setFormData({
      ...formData,
      dont_list: formData.dont_list.filter((_, i) => i !== index),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
            <h3 className="font-semibold">
              {isNew ? 'Create New Format' : `Edit: ${format.name}`}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-[#F5F5F5] rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              {isNew && (
                <div>
                  <label className="block text-xs font-medium text-[#737373] mb-1">
                    Format ID (lowercase, no spaces)
                  </label>
                  <input
                    type="text"
                    value={formData.format_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        format_id: e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, '_'),
                      })
                    }
                    className="w-full h-9 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                    placeholder="e.g., my_custom_format"
                  />
                </div>
              )}
              <div className={isNew ? '' : 'col-span-2'}>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full h-9 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                  placeholder="Format display name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full h-20 px-3 py-2 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
                placeholder="Brief description of when to use this format"
              />
            </div>

            {/* Structure */}
            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">
                Structure (Step-by-step how to write in this format)
              </label>
              <textarea
                value={formData.structure}
                onChange={(e) =>
                  setFormData({ ...formData, structure: e.target.value })
                }
                className="w-full h-64 px-3 py-2 text-sm font-mono border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
                placeholder="1. OPENING (2-3 paragraphs)&#10;Start with...&#10;&#10;2. THE PROBLEM&#10;Show the issue through..."
              />
            </div>

            {/* Voice & Pacing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Voice Notes
                </label>
                <textarea
                  value={formData.voice_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, voice_notes: e.target.value })
                  }
                  className="w-full h-32 px-3 py-2 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
                  placeholder="How it should sound...&#10;- Raw, emotional&#10;- Casual language"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">
                  Pacing
                </label>
                <textarea
                  value={formData.pacing}
                  onChange={(e) =>
                    setFormData({ ...formData, pacing: e.target.value })
                  }
                  className="w-full h-32 px-3 py-2 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
                  placeholder="When to reveal what...&#10;- 60% story before solution&#10;- Problem by paragraph 3"
                />
              </div>
            </div>

            {/* Do List */}
            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">
                Must Include (Do List)
              </label>
              <div className="space-y-2">
                {formData.do_list.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-green-50 rounded"
                  >
                    <span className="flex-1 text-sm text-green-800">{item}</span>
                    <button
                      onClick={() => handleRemoveDoItem(index)}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-3 h-3 text-green-600" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDoItem}
                    onChange={(e) => setNewDoItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDoItem()}
                    className="flex-1 h-8 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                    placeholder="Add do item..."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDoItem}
                    disabled={!newDoItem.trim()}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Don't List */}
            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">
                Must Avoid (Don't List)
              </label>
              <div className="space-y-2">
                {formData.dont_list.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-red-50 rounded"
                  >
                    <span className="flex-1 text-sm text-red-800">{item}</span>
                    <button
                      onClick={() => handleRemoveDontItem(index)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDontItem}
                    onChange={(e) => setNewDontItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDontItem()}
                    className="flex-1 h-8 px-3 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black"
                    placeholder="Add don't item..."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDontItem}
                    disabled={!newDontItem.trim()}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Reference Images - only show for existing formats */}
            {!isNew && (
              <div
                onPaste={handlePaste}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-[#737373]">
                    Reference Images ({formData.reference_image_urls.length})
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 mr-1" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Drop zone / Image grid */}
                <div
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    isDragging
                      ? 'border-black bg-gray-50'
                      : 'border-[#E5E5E5]'
                  }`}
                >
                  {formData.reference_image_urls.length === 0 ? (
                    <div className="text-center py-6">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-[#A3A3A3]" />
                      <p className="text-sm text-[#737373] mb-1">
                        Drop images here, paste with ⌘V, or click Upload
                      </p>
                      <p className="text-xs text-[#A3A3A3]">
                        These images teach AI what this format should look like visually
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {formData.reference_image_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Reference ${index + 1}`}
                            className="w-full aspect-square object-cover rounded border border-[#E5E5E5]"
                          />
                          <button
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {/* Add more button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-square border-2 border-dashed border-[#E5E5E5] rounded flex items-center justify-center hover:border-[#A3A3A3] transition-colors"
                      >
                        <Plus className="w-6 h-6 text-[#A3A3A3]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isNew && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>Note:</strong> Save the format first, then you can add reference images.
              </div>
            )}

            {/* Linked Swipes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-[#737373]">
                  Linked Swipe Examples ({formData.linked_swipe_ids.length})
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSwipeSelector(true)}
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  Manage Links
                </Button>
              </div>
              {formData.linked_swipe_ids.length > 0 && (
                <p className="text-xs text-[#A3A3A3]">
                  {formData.linked_swipe_ids.length} swipe file(s) linked as
                  examples
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#E5E5E5] flex items-center justify-between">
            <div>
              {!isNew && format?.is_default && onReset && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset to Default
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => onSave(formData)}
                disabled={isLoading || !formData.name || !formData.structure}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isNew ? (
                  'Create Format'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showSwipeSelector && (
        <SwipeSelectorModal
          linkedSwipeIds={formData.linked_swipe_ids}
          onLink={(id) =>
            setFormData({
              ...formData,
              linked_swipe_ids: [...formData.linked_swipe_ids, id],
            })
          }
          onUnlink={(id) =>
            setFormData({
              ...formData,
              linked_swipe_ids: formData.linked_swipe_ids.filter(
                (sid) => sid !== id
              ),
            })
          }
          onClose={() => setShowSwipeSelector(false)}
        />
      )}
    </>
  )
}

// Main Component
export function FormatsSection() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingFormat, setEditingFormat] = useState<AdFormat | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Queries
  const {
    data: formats = [],
    isLoading,
  } = useQuery({
    queryKey: ['formats'],
    queryFn: fetchFormats,
    enabled: isExpanded,
  })

  // Mutations
  const seedMutation = useMutation({
    mutationFn: seedFormats,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] })
      toast.success('Default formats seeded')
    },
    onError: () => toast.error('Failed to seed formats'),
  })

  const createMutation = useMutation({
    mutationFn: createFormat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] })
      toast.success('Format created')
      setIsCreating(false)
    },
    onError: () => toast.error('Failed to create format'),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      format_id,
      data,
    }: {
      format_id: string
      data: Partial<AdFormat>
    }) => updateFormat(format_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] })
      toast.success('Format updated')
      setEditingFormat(null)
    },
    onError: () => toast.error('Failed to update format'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFormat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] })
      toast.success('Format deleted')
    },
    onError: () => toast.error('Failed to delete format'),
  })

  const resetMutation = useMutation({
    mutationFn: resetFormat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] })
      toast.success('Format reset to default')
      setEditingFormat(null)
    },
    onError: () => toast.error('Failed to reset format'),
  })

  const resetAllMutation = useMutation({
    mutationFn: resetAllFormats,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formats'] })
      toast.success('All formats reset to defaults')
    },
    onError: () => toast.error('Failed to reset formats'),
  })

  // Seed on first expand if no formats
  useEffect(() => {
    if (isExpanded && formats.length === 0 && !isLoading) {
      seedMutation.mutate()
    }
  }, [isExpanded, formats.length, isLoading])

  return (
    <div className="border border-[#E5E5E5] rounded">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#737373]" />
          <span className="text-xs font-medium text-[#737373] uppercase tracking-wide">
            Ad Copy Formats
          </span>
          <span className="text-xs text-[#A3A3A3]">
            ({formats.length} formats)
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
        <div className="border-t border-[#E5E5E5] p-4">
          <p className="text-xs text-[#A3A3A3] mb-4">
            AI picks ONE format per ad and commits fully to its voice,
            structure, and pacing. Link swipe files as examples for each format.
          </p>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Format
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetAllMutation.mutate()}
              disabled={resetAllMutation.isPending}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset All
            </Button>
          </div>

          {/* Format Grid */}
          {isLoading || seedMutation.isPending ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
            </div>
          ) : formats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#A3A3A3] mb-3">No formats found</p>
              <Button size="sm" onClick={() => seedMutation.mutate()}>
                Seed Default Formats
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {formats.map((format) => (
                <FormatCard
                  key={format.id}
                  format={format}
                  onEdit={() => setEditingFormat(format)}
                  onDelete={() => {
                    if (confirm(`Delete format "${format.name}"?`)) {
                      deleteMutation.mutate(format.format_id)
                    }
                  }}
                  onReset={() => resetMutation.mutate(format.format_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingFormat && (
        <FormatEditorModal
          format={editingFormat}
          onSave={(data) =>
            updateMutation.mutate({
              format_id: editingFormat.format_id,
              data,
            })
          }
          onReset={() => resetMutation.mutate(editingFormat.format_id)}
          onClose={() => setEditingFormat(null)}
          isLoading={updateMutation.isPending || resetMutation.isPending}
        />
      )}

      {/* Create Modal */}
      {isCreating && (
        <FormatEditorModal
          format={null}
          onSave={(data) => createMutation.mutate(data)}
          onClose={() => setIsCreating(false)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
