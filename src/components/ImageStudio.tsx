import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Image as ImageIcon,
  Wand2,
  Download,
  Trash2,
  Copy,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'
import { API_BASE } from '../config'
import { authFetch, useAuth } from '../auth'

interface StylePreset {
  id: string
  name: string
  description: string
}

interface GeneratedImage {
  id: string
  image_url: string
  prompt: string
  style_preset: string
  aspect_ratio: string
  model_used: string
  generation_time_ms: number
  created_at: string
}

const ASPECT_RATIOS = [
  { id: '1:1', name: 'Square (1:1)', description: 'Best for Facebook feed' },
  { id: '9:16', name: 'Vertical (9:16)', description: 'Best for Stories/Reels' },
  { id: '4:3', name: 'Landscape (4:3)', description: 'Standard landscape' },
  { id: '16:9', name: 'Wide (16:9)', description: 'Cinematic wide' },
]

async function fetchStyles(): Promise<StylePreset[]> {
  const res = await authFetch(`${API_BASE}/images/styles`)
  if (!res.ok) throw new Error('Failed to fetch styles')
  const data = await res.json()
  return data.styles
}

async function fetchHistory(): Promise<GeneratedImage[]> {
  const res = await authFetch(`${API_BASE}/images/history?limit=50`)
  if (!res.ok) throw new Error('Failed to fetch history')
  const data = await res.json()
  return data.images
}

async function generateImages(params: {
  prompt: string
  style_preset: string
  aspect_ratio: string
  quantity: number
  reference_images?: string[]
}): Promise<{ images: GeneratedImage[]; errors?: string[] }> {
  const res = await authFetch(`${API_BASE}/images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.detail || 'Generation failed')
  }
  return res.json()
}

async function deleteImage(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/images/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
}

export function ImageStudio() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState('native_ugc')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [quantity, setQuantity] = useState(1)
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)

  const { data: styles = [] } = useQuery({
    queryKey: ['image-styles'],
    queryFn: fetchStyles,
    enabled: isAuthenticated,
  })

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['image-history'],
    queryFn: fetchHistory,
    enabled: isAuthenticated,
  })

  const generateMutation = useMutation({
    mutationFn: generateImages,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['image-history'] })
      if (data.images.length > 0) {
        toast.success(`Generated ${data.images.length} image(s)`)
      }
      if (data.errors?.length) {
        toast.error(`Some images failed: ${data.errors[0]}`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-history'] })
      toast.success('Image deleted')
      setSelectedImage(null)
    },
    onError: () => {
      toast.error('Failed to delete image')
    },
  })

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    generateMutation.mutate({
      prompt: prompt.trim(),
      style_preset: stylePreset,
      aspect_ratio: aspectRatio,
      quantity,
      reference_images: referenceImages.length > 0 ? referenceImages : undefined,
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (referenceImages.length >= 5) {
        toast.error('Maximum 5 reference images')
        break
      }

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setReferenceImages((prev) => [...prev, dataUrl])
      }
      reader.readAsDataURL(file)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeReferenceImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index))
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('URL copied')
  }

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Generator */}
      <div className="w-[400px] border-r border-[#E5E5E5] flex flex-col">
        <div className="p-4 border-b border-[#E5E5E5]">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Image Studio
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1.5">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full h-24 px-3 py-2 text-sm border border-[#E5E5E5] rounded focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Style Preset */}
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1.5">
              Style
            </label>
            <select
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[#E5E5E5] rounded bg-white focus:outline-none focus:border-black"
            >
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
            {styles.find((s) => s.id === stylePreset)?.description && (
              <p className="mt-1 text-xs text-[#A3A3A3]">
                {styles.find((s) => s.id === stylePreset)?.description}
              </p>
            )}
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1.5">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id)}
                  className={`px-3 py-2 text-xs border rounded transition-colors ${
                    aspectRatio === ratio.id
                      ? 'border-black bg-black text-white'
                      : 'border-[#E5E5E5] hover:border-[#A3A3A3]'
                  }`}
                >
                  {ratio.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1.5">
              Quantity
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className={`w-10 h-9 text-sm border rounded transition-colors ${
                    quantity === n
                      ? 'border-black bg-black text-white'
                      : 'border-[#E5E5E5] hover:border-[#A3A3A3]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Images */}
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1.5">
              Reference Images (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {referenceImages.map((img, i) => (
                <div key={i} className="relative w-16 h-16 group">
                  <img
                    src={img}
                    alt={`Reference ${i + 1}`}
                    className="w-full h-full object-cover rounded border border-[#E5E5E5]"
                  />
                  <button
                    onClick={() => removeReferenceImage(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {referenceImages.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 border border-dashed border-[#E5E5E5] rounded flex items-center justify-center hover:border-[#A3A3A3] transition-colors"
                >
                  <Plus className="w-5 h-5 text-[#A3A3A3]" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="mt-1 text-xs text-[#A3A3A3]">
              Add up to 5 images for style reference
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t border-[#E5E5E5]">
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate {quantity > 1 ? `${quantity} Images` : 'Image'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 className="text-sm font-semibold">Generated Images</h2>
          <span className="text-xs text-[#A3A3A3]">{history.length} images</span>
        </div>

        {isLoadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#A3A3A3]" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#A3A3A3]">
            <ImageIcon className="w-12 h-12 mb-3" />
            <p className="text-sm">No images generated yet</p>
            <p className="text-xs mt-1">Enter a prompt and click Generate</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {history.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-square cursor-pointer rounded overflow-hidden border-2 transition-colors ${
                    selectedImage?.id === img.id
                      ? 'border-black'
                      : 'border-transparent hover:border-[#E5E5E5]'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={img.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs truncate">{img.style_preset || 'custom'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Image Detail */}
        {selectedImage && (
          <div className="border-t border-[#E5E5E5] p-4">
            <div className="flex gap-4">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                className="w-32 h-32 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedImage.prompt}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#737373]">
                  <span className="px-2 py-0.5 bg-[#F5F5F5] rounded">
                    {selectedImage.style_preset || 'custom'}
                  </span>
                  <span className="px-2 py-0.5 bg-[#F5F5F5] rounded">
                    {selectedImage.aspect_ratio}
                  </span>
                  {selectedImage.generation_time_ms && (
                    <span className="px-2 py-0.5 bg-[#F5F5F5] rounded">
                      {(selectedImage.generation_time_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedImage.image_url)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadImage(selectedImage.image_url, `image-${selectedImage.id}.png`)
                    }
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedImage.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
