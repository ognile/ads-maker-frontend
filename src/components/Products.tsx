import { useState, useRef, useEffect } from 'react'
import { RefreshCw, Trash2, Plus, X, Edit2, Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './ui/button'
import type { Product, DataSource } from '../App'

interface ProductsProps {
  products: Product[]
  onRefresh: () => void
}

import { API_BASE } from '../config'

export function Products({ products, onRefresh }: ProductsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [productSources, setProductSources] = useState<Record<string, DataSource[]>>({})

  // Form state
  const [name, setName] = useState('')
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const [mechanism, setMechanism] = useState('')
  const [ingredients, setIngredients] = useState('')

  // Data source modal state
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [sourceProductId, setSourceProductId] = useState<string | null>(null)
  const [sourceMode, setSourceMode] = useState<'file' | 'text'>('text')
  const [sourceName, setSourceName] = useState('')
  const [sourceContent, setSourceContent] = useState('')
  const [sourceFileType, setSourceFileType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch data sources for expanded product
  useEffect(() => {
    if (expandedProductId && !productSources[expandedProductId]) {
      fetchProductSources(expandedProductId)
    }
  }, [expandedProductId])

  const fetchProductSources = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE}/data-sources/product/${productId}`)
      if (res.ok) {
        const sources = await res.json()
        setProductSources(prev => ({ ...prev, [productId]: sources }))
      }
    } catch (error) {
      console.error('Failed to fetch product sources:', error)
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setLandingPageUrl('')
    setMechanism('')
    setIngredients('')
    setModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setLandingPageUrl(product.landing_page_url || '')
    setMechanism(product.mechanism || '')
    setIngredients(product.ingredients || '')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      const url = editingProduct
        ? `${API_BASE}/products/${editingProduct.id}`
        : `${API_BASE}/products`

      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          landing_page_url: landingPageUrl.trim() || null,
          mechanism: mechanism.trim() || null,
          ingredients: ingredients.trim() || null,
        }),
      })

      if (res.ok) {
        setModalOpen(false)
        onRefresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      onRefresh()
    }
  }

  const toggleExpanded = (productId: string) => {
    setExpandedProductId(prev => prev === productId ? null : productId)
  }

  // Data source handlers
  const openSourceModal = (productId: string, mode: 'file' | 'text') => {
    setSourceProductId(productId)
    setSourceMode(mode)
    setSourceName('')
    setSourceContent('')
    setSourceFileType(null)
    setSourceModalOpen(true)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    setSourceFileType(ext || null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setSourceContent(text)
      if (!sourceName) {
        setSourceName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
    reader.readAsText(file)
  }

  const handleAddSource = async () => {
    if (!sourceName.trim() || !sourceContent.trim() || !sourceProductId) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/data-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sourceName.trim(),
          source_type: sourceMode,
          file_type: sourceFileType,
          content: sourceContent.trim(),
          product_id: sourceProductId,
        }),
      })
      if (res.ok) {
        setSourceModalOpen(false)
        fetchProductSources(sourceProductId)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSource = async (sourceId: string, productId: string) => {
    const res = await fetch(`${API_BASE}/data-sources/${sourceId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchProductSources(productId)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Products</h2>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="border border-[#E5E5E5] p-8 text-center">
              <p className="text-sm text-[#A3A3A3]">No products yet</p>
              <p className="text-xs text-[#A3A3A3] mt-1">Add a product to start generating ads</p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="border border-[#E5E5E5]"
              >
                {/* Product Header */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{product.name}</h3>
                      {product.landing_page_url && (
                        <a
                          href={product.landing_page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#737373] hover:underline"
                        >
                          {product.landing_page_url}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleExpanded(product.id)}
                        className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
                      >
                        {expandedProductId === product.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {product.mechanism && (
                    <div>
                      <span className="text-xs text-[#737373] uppercase tracking-wide">Mechanism</span>
                      <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-3">{product.mechanism}</p>
                    </div>
                  )}

                  {product.ingredients && (
                    <div>
                      <span className="text-xs text-[#737373] uppercase tracking-wide">Ingredients</span>
                      <p className="text-sm mt-1 whitespace-pre-wrap line-clamp-2">{product.ingredients}</p>
                    </div>
                  )}
                </div>

                {/* Expanded Data Sources Section */}
                {expandedProductId === product.id && (
                  <div className="border-t border-[#E5E5E5] p-4 bg-[#FAFAFA]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                        Data Sources ({productSources[product.id]?.length || 0})
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openSourceModal(product.id, 'file')}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          Upload
                        </button>
                        <button
                          onClick={() => openSourceModal(product.id, 'text')}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          Paste
                        </button>
                      </div>
                    </div>

                    {/* Naming hint */}
                    <p className="text-xs text-[#A3A3A3] mb-3">
                      Name tips: "metrics" = performance data | "reviews" = customer reviews | "survey" = survey data
                    </p>

                    {/* Sources List */}
                    {!productSources[product.id] || productSources[product.id].length === 0 ? (
                      <div className="border border-[#E5E5E5] border-dashed p-4 text-center bg-white">
                        <p className="text-xs text-[#A3A3A3]">No data sources for this product</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {productSources[product.id].map((source) => (
                          <div
                            key={source.id}
                            className="border border-[#E5E5E5] bg-white p-2 flex items-center justify-between"
                          >
                            <div>
                              <span className="text-sm">{source.name}</span>
                              <span className="text-xs text-[#A3A3A3] ml-2">
                                {source.content.length.toLocaleString()} chars
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteSource(source.id, product.id)}
                              className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.txt,.pdf"
        className="hidden"
      />

      {/* Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., NUORA"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Landing Page URL</label>
                <input
                  type="text"
                  value={landingPageUrl}
                  onChange={(e) => setLandingPageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mechanism</label>
                <p className="text-xs text-[#737373]">Problem/solution mechanism explanation</p>
                <textarea
                  value={mechanism}
                  onChange={(e) => setMechanism(e.target.value)}
                  placeholder="PROBLEM MECHANISM:&#10;Why does the problem exist?&#10;&#10;SOLUTION MECHANISM:&#10;Why does the solution work?"
                  className="w-full h-32 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ingredients</label>
                <p className="text-xs text-[#737373]">Key ingredients and their benefits</p>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="List key ingredients and what they do..."
                  className="w-full h-24 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!name.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Modal */}
      {sourceModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-lg m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">
                {sourceMode === 'file' ? 'Upload File' : 'Paste Text'}
              </h3>
              <button
                onClick={() => setSourceModalOpen(false)}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g., December Metrics, Customer Reviews"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              {sourceMode === 'file' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">File</label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {sourceContent ? 'Change File' : 'Choose File'}
                  </Button>
                  {sourceContent && (
                    <p className="text-xs text-[#737373]">
                      Loaded: {sourceContent.split('\n').length} lines
                      {sourceFileType && ` (${sourceFileType.toUpperCase()})`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <textarea
                    value={sourceContent}
                    onChange={(e) => setSourceContent(e.target.value)}
                    placeholder="Paste your content here..."
                    className="w-full h-48 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSourceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddSource}
                  disabled={!sourceName.trim() || !sourceContent.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
