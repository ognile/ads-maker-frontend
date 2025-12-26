import { useState } from 'react'
import { RefreshCw, Trash2, Plus, X, Edit2 } from 'lucide-react'
import { Button } from './ui/button'
import type { Product } from '../App'

interface ProductsProps {
  products: Product[]
  onRefresh: () => void
}

const API_BASE = '/api'

export function Products({ products, onRefresh }: ProductsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const [mechanism, setMechanism] = useState('')
  const [ingredients, setIngredients] = useState('')

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
                className="border border-[#E5E5E5] p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
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
            ))
          )}
        </div>
      </div>

      {/* Modal */}
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
    </div>
  )
}
