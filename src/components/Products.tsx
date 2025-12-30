import { useState, useRef, useEffect } from 'react'
import { RefreshCw, Trash2, Plus, X, Edit2, Upload, ChevronDown, ChevronUp, Search, Zap, FileText, Users, BookOpen, Lightbulb, Check } from 'lucide-react'
import { Button } from './ui/button'
import type { Product, DataSource } from '../App'

interface ProductsProps {
  products: Product[]
  onRefresh: () => void
}

import { API_BASE } from '../config'
import { authFetch } from '../auth'

// Extended DataSource with category
interface CategorizedDataSource extends DataSource {
  category: 'hook' | 'example' | 'reviews' | 'survey' | 'document'
}

type CategoryKey = 'hook' | 'example' | 'reviews' | 'survey' | 'document'

const CATEGORY_CONFIG: Record<CategoryKey, { label: string; icon: typeof Lightbulb; color: string; description: string }> = {
  hook: { label: 'Hooks & Angles', icon: Zap, color: 'text-amber-600', description: 'One-liners, openers, viral concepts' },
  example: { label: 'Copy Examples', icon: FileText, color: 'text-blue-600', description: 'Full ads to match style' },
  reviews: { label: 'Customer Reviews', icon: Users, color: 'text-green-600', description: 'Customer testimonials' },
  survey: { label: 'Survey Data', icon: Users, color: 'text-purple-600', description: 'Desires & experiences' },
  document: { label: 'Documents', icon: BookOpen, color: 'text-gray-600', description: 'Mechanism, metrics, other' },
}

export function Products({ products, onRefresh }: ProductsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [productSources, setProductSources] = useState<Record<string, CategorizedDataSource[]>>({})

  // Form state
  const [name, setName] = useState('')
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const [mechanism, setMechanism] = useState('')
  const [ingredients, setIngredients] = useState('')

  // Quick add state
  const [quickAddContent, setQuickAddContent] = useState('')
  const [quickAddSubmitting, setQuickAddSubmitting] = useState(false)

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    hook: true,
    example: true,
    reviews: false,
    survey: false,
    document: false,
  })

  // Edit source state
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [editingSourceContent, setEditingSourceContent] = useState('')
  const [editingSourceName, setEditingSourceName] = useState('')

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<CategoryKey>('example')
  const [uploadName, setUploadName] = useState('')
  const [uploadContent, setUploadContent] = useState('')
  const [uploadFileType, setUploadFileType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-select first product
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id)
    }
  }, [products])

  // Fetch sources when product selected
  useEffect(() => {
    if (selectedProductId && !productSources[selectedProductId]) {
      fetchProductSources(selectedProductId)
    }
  }, [selectedProductId])

  const fetchProductSources = async (productId: string) => {
    try {
      const res = await authFetch(`${API_BASE}/data-sources/product/${productId}`)
      if (res.ok) {
        const sources = await res.json()
        setProductSources(prev => ({ ...prev, [productId]: sources }))
      }
    } catch (error) {
      console.error('Failed to fetch product sources:', error)
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const sources = selectedProductId ? (productSources[selectedProductId] || []) : []

  // Group sources by category
  const sourcesByCategory = sources.reduce((acc, source) => {
    const category = (source.category || 'document') as CategoryKey
    if (!acc[category]) acc[category] = []
    acc[category].push(source)
    return acc
  }, {} as Record<CategoryKey, CategorizedDataSource[]>)

  // Filter sources by search
  const filterSources = (sources: CategorizedDataSource[]) => {
    if (!searchQuery) return sources
    const query = searchQuery.toLowerCase()
    return sources.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.content.toLowerCase().includes(query)
    )
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

      const res = await authFetch(url, {
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
    if (!confirm('Delete this product and all its data sources?')) return
    const res = await authFetch(`${API_BASE}/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (selectedProductId === id) {
        setSelectedProductId(products.find(p => p.id !== id)?.id || null)
      }
      onRefresh()
    }
  }

  // Quick add handler
  const handleQuickAdd = async () => {
    if (!quickAddContent.trim() || !selectedProductId) return

    setQuickAddSubmitting(true)
    try {
      const res = await authFetch(`${API_BASE}/data-sources/quick-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: quickAddContent.trim(),
          product_id: selectedProductId,
        }),
      })
      if (res.ok) {
        setQuickAddContent('')
        fetchProductSources(selectedProductId)
      }
    } finally {
      setQuickAddSubmitting(false)
    }
  }

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    setUploadFileType(ext || null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setUploadContent(text)
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
    reader.readAsText(file)
  }

  // Add source from upload modal
  const handleUploadSubmit = async () => {
    if (!uploadName.trim() || !uploadContent.trim() || !selectedProductId) return

    setIsSubmitting(true)
    try {
      const res = await authFetch(`${API_BASE}/data-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim(),
          source_type: uploadFileType ? 'file' : 'text',
          file_type: uploadFileType,
          content: uploadContent.trim(),
          product_id: selectedProductId,
          category: uploadCategory,
        }),
      })
      if (res.ok) {
        setUploadModalOpen(false)
        setUploadName('')
        setUploadContent('')
        setUploadFileType(null)
        fetchProductSources(selectedProductId)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit source handlers
  const startEditSource = (source: CategorizedDataSource) => {
    setEditingSourceId(source.id)
    setEditingSourceContent(source.content)
    setEditingSourceName(source.name)
  }

  const cancelEditSource = () => {
    setEditingSourceId(null)
    setEditingSourceContent('')
    setEditingSourceName('')
  }

  const saveEditSource = async () => {
    if (!editingSourceId || !selectedProductId) return

    setIsSubmitting(true)
    try {
      const res = await authFetch(`${API_BASE}/data-sources/${editingSourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingSourceName.trim(),
          content: editingSourceContent.trim(),
        }),
      })
      if (res.ok) {
        cancelEditSource()
        fetchProductSources(selectedProductId)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!selectedProductId) return
    const res = await authFetch(`${API_BASE}/data-sources/${sourceId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchProductSources(selectedProductId)
    }
  }

  const toggleCategory = (category: CategoryKey) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const openUploadModal = (category: CategoryKey) => {
    setUploadCategory(category)
    setUploadName('')
    setUploadContent('')
    setUploadFileType(null)
    setUploadModalOpen(true)
  }

  // Render a source item
  const renderSourceItem = (source: CategorizedDataSource) => {
    const isEditing = editingSourceId === source.id
    const preview = source.content.slice(0, 100).replace(/\n/g, ' ')

    if (isEditing) {
      return (
        <div key={source.id} className="border border-black bg-white p-3 space-y-2">
          <input
            type="text"
            value={editingSourceName}
            onChange={(e) => setEditingSourceName(e.target.value)}
            className="w-full h-8 px-2 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
          />
          <textarea
            value={editingSourceContent}
            onChange={(e) => setEditingSourceContent(e.target.value)}
            className="w-full h-32 p-2 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black font-mono"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEditSource} disabled={isSubmitting}>
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEditSource}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div
        key={source.id}
        className="border border-[#E5E5E5] bg-white p-3 hover:border-[#D4D4D4] transition-colors group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{source.name}</span>
              <span className="text-xs text-[#A3A3A3] shrink-0">
                {source.content.length.toLocaleString()} chars
              </span>
            </div>
            <p className="text-xs text-[#737373] mt-1 line-clamp-2">
              {preview}{source.content.length > 100 ? '...' : ''}
            </p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => startEditSource(source)}
              className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDeleteSource(source.id)}
              className="p-1 text-[#A3A3A3] hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render a category section
  const renderCategory = (category: CategoryKey) => {
    const config = CATEGORY_CONFIG[category]
    const categorySources = filterSources(sourcesByCategory[category] || [])
    const isExpanded = expandedCategories[category]
    const Icon = config.icon

    return (
      <div key={category} className="border border-[#E5E5E5]">
        <button
          onClick={() => toggleCategory(category)}
          className="w-full p-3 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="text-sm font-medium">{config.label}</span>
            <span className="text-xs text-[#A3A3A3]">
              ({categorySources.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); openUploadModal(category) }}
              className="text-xs text-[#737373] hover:text-black px-2 py-1 border border-[#E5E5E5] hover:border-[#D4D4D4]"
            >
              + Add
            </button>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-[#E5E5E5] p-3 bg-[#FAFAFA] space-y-2">
            {categorySources.length === 0 ? (
              <div className="border border-dashed border-[#E5E5E5] p-4 text-center bg-white">
                <p className="text-xs text-[#A3A3A3]">{config.description}</p>
                <button
                  onClick={() => openUploadModal(category)}
                  className="text-xs text-[#737373] hover:text-black mt-2 underline"
                >
                  Add {config.label.toLowerCase()}
                </button>
              </div>
            ) : (
              categorySources.map(renderSourceItem)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[900px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {products.length === 0 ? (
          <div className="border border-[#E5E5E5] p-8 text-center">
            <p className="text-sm text-[#A3A3A3]">No products yet</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Add a product to start generating ads</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Product Sidebar */}
            <div className="w-48 shrink-0 space-y-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  className={`w-full text-left p-3 border transition-colors ${
                    selectedProductId === product.id
                      ? 'border-black bg-white'
                      : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                  }`}
                >
                  <span className="text-sm font-medium block truncate">{product.name}</span>
                  {product.landing_page_url && (
                    <span className="text-xs text-[#A3A3A3] block truncate">
                      {new URL(product.landing_page_url).hostname}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Main Content */}
            {selectedProduct && (
              <div className="flex-1 space-y-4">
                {/* Product Header */}
                <div className="border border-[#E5E5E5] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                      {selectedProduct.landing_page_url && (
                        <a
                          href={selectedProduct.landing_page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#737373] hover:underline"
                        >
                          {selectedProduct.landing_page_url}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(selectedProduct)}
                        className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(selectedProduct.id)}
                        className="p-2 text-[#A3A3A3] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Add */}
                <div className="border border-[#E5E5E5] p-4 bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Quick Add</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickAddContent}
                      onChange={(e) => setQuickAddContent(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                      placeholder="Paste hook, angle, or idea... (press Enter)"
                      className="flex-1 h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
                    />
                    <Button
                      size="sm"
                      onClick={handleQuickAdd}
                      disabled={!quickAddContent.trim() || quickAddSubmitting}
                    >
                      {quickAddSubmitting ? '...' : 'Add'}
                    </Button>
                  </div>
                  <p className="text-xs text-[#A3A3A3] mt-2">
                    Short content → Hook | Long content → Copy Example | Auto-detected
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all content..."
                    className="w-full h-9 pl-9 pr-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                  />
                </div>

                {/* Category Sections */}
                <div className="space-y-3">
                  {(['hook', 'example', 'reviews', 'survey', 'document'] as CategoryKey[]).map(renderCategory)}
                </div>
              </div>
            )}
          </div>
        )}
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
                  placeholder="e.g., NUORA GUMMIES"
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
                <textarea
                  value={mechanism}
                  onChange={(e) => setMechanism(e.target.value)}
                  placeholder="Problem mechanism: Why does the problem exist?&#10;Solution mechanism: Why does the solution work?"
                  className="w-full h-32 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ingredients</label>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="Key ingredients and their benefits..."
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

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Add {CATEGORY_CONFIG[uploadCategory].label}</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as CategoryKey)}
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g., Customer Reviews December"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Content</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Upload File
                  </Button>
                </div>
                <textarea
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Paste content or upload a file..."
                  className="w-full h-48 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black font-mono"
                />
                {uploadContent && (
                  <p className="text-xs text-[#737373]">
                    {uploadContent.length.toLocaleString()} characters
                    {uploadFileType && ` • ${uploadFileType.toUpperCase()}`}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUploadSubmit}
                  disabled={!uploadName.trim() || !uploadContent.trim() || isSubmitting}
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
