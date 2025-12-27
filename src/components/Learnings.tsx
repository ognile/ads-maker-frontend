import { useState, useEffect } from 'react'
import { RefreshCw, Plus, ThumbsUp, ThumbsDown, Trash2, Edit2, X, Video, Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react'
import { API_BASE } from '../config'

interface Learning {
  id: string
  insight: string
  category: string
  type: 'do' | 'avoid'
  confidence: number
  applies_to: string
  product_id: string | null
  evidence: {
    ad_ids?: string[]
    ad_names?: string[]
    avg_metrics?: Record<string, number>
    sample_size?: number
  } | null
  is_active: boolean
  created_at: string
}

interface LearningsResponse {
  learnings: Learning[]
  total: number
  filters: {
    product_id: string | null
    type: string | null
    applies_to: string | null
  }
}

const CATEGORIES = ['visual', 'copy', 'hook', 'cta', 'targeting', 'offer', 'format', 'mechanism', 'avatar']
const APPLIES_TO_OPTIONS = ['all', 'video', 'image', 'text']

const CATEGORY_COLORS: Record<string, string> = {
  visual: 'bg-purple-100 text-purple-800',
  copy: 'bg-blue-100 text-blue-800',
  hook: 'bg-orange-100 text-orange-800',
  cta: 'bg-green-100 text-green-800',
  targeting: 'bg-red-100 text-red-800',
  offer: 'bg-yellow-100 text-yellow-800',
  format: 'bg-gray-100 text-gray-800',
  mechanism: 'bg-indigo-100 text-indigo-800',
  avatar: 'bg-pink-100 text-pink-800',
}

function AppliesTo({ value }: { value: string }) {
  const icons: Record<string, React.ReactNode> = {
    video: <Video className="w-3 h-3" />,
    image: <ImageIcon className="w-3 h-3" />,
    text: <MessageSquare className="w-3 h-3" />,
    all: <Sparkles className="w-3 h-3" />,
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#737373]">
      {icons[value] || icons.all}
      <span>{value}</span>
    </span>
  )
}

export function Learnings() {
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [appliesToFilter, setAppliesToFilter] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLearning, setEditingLearning] = useState<Learning | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formInsight, setFormInsight] = useState('')
  const [formCategory, setFormCategory] = useState('hook')
  const [formType, setFormType] = useState<'do' | 'avoid'>('do')
  const [formConfidence, setFormConfidence] = useState(0.8)
  const [formAppliesTo, setFormAppliesTo] = useState('all')

  const fetchLearnings = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (appliesToFilter) params.set('applies_to', appliesToFilter)

      const res = await fetch(`${API_BASE}/analysis/learnings/v2?${params}`)
      if (res.ok) {
        const data: LearningsResponse = await res.json()
        setLearnings(data.learnings)
      }
    } catch (error) {
      console.error('Failed to fetch learnings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLearnings()
  }, [categoryFilter, appliesToFilter])

  const openAddModal = () => {
    setEditingLearning(null)
    setFormInsight('')
    setFormCategory('hook')
    setFormType('do')
    setFormConfidence(0.8)
    setFormAppliesTo('all')
    setIsModalOpen(true)
  }

  const openEditModal = (learning: Learning) => {
    setEditingLearning(learning)
    setFormInsight(learning.insight)
    setFormCategory(learning.category)
    setFormType(learning.type)
    setFormConfidence(learning.confidence)
    setFormAppliesTo(learning.applies_to)
    setIsModalOpen(true)
  }

  const saveLearning = async () => {
    setIsSaving(true)
    try {
      const payload = {
        insight: formInsight,
        category: formCategory,
        learning_type: formType,
        confidence: formConfidence,
        applies_to: formAppliesTo,
      }

      if (editingLearning) {
        // Update
        await fetch(`${API_BASE}/analysis/learnings/${editingLearning.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Create
        await fetch(`${API_BASE}/analysis/learnings/v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      setIsModalOpen(false)
      fetchLearnings()
    } catch (error) {
      console.error('Failed to save learning:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteLearning = async (id: string) => {
    if (!confirm('Are you sure you want to delete this learning?')) return

    try {
      await fetch(`${API_BASE}/analysis/learnings/${id}/hard`, { method: 'DELETE' })
      fetchLearnings()
    } catch (error) {
      console.error('Failed to delete learning:', error)
    }
  }

  const doLearnings = learnings.filter(l => l.type === 'do')
  const avoidLearnings = learnings.filter(l => l.type === 'avoid')

  const LearningCard = ({ learning }: { learning: Learning }) => (
    <div className="border border-[#E5E5E5] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm flex-1">{learning.insight}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => openEditModal(learning)}
            className="p-1 text-[#A3A3A3] hover:text-black"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteLearning(learning.id)}
            className="p-1 text-[#A3A3A3] hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[learning.category] || 'bg-gray-100 text-gray-800'}`}>
          {learning.category}
        </span>
        <AppliesTo value={learning.applies_to} />
        <span className="text-xs text-[#A3A3A3]">
          {Math.round(learning.confidence * 100)}% confidence
        </span>
      </div>

      {learning.evidence?.ad_names && learning.evidence.ad_names.length > 0 && (
        <div className="text-xs text-[#737373]">
          <span className="font-medium">Evidence:</span> {learning.evidence.ad_names.length} ads
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-[#A3A3A3]">Loading learnings...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Learnings</h2>
            <span className="text-sm text-[#A3A3A3]">({learnings.length} total)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLearnings}
              className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white hover:bg-[#333]"
            >
              <Plus className="w-4 h-4" />
              Add Learning
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373]">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border border-[#E5E5E5] px-2 py-1 bg-white"
            >
              <option value="">All</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373]">Applies to:</span>
            <select
              value={appliesToFilter}
              onChange={(e) => setAppliesToFilter(e.target.value)}
              className="text-sm border border-[#E5E5E5] px-2 py-1 bg-white"
            >
              <option value="">All</option>
              {APPLIES_TO_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* DO column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-medium text-green-700">What Works ({doLearnings.length})</h3>
            </div>
            {doLearnings.length === 0 ? (
              <p className="text-sm text-[#A3A3A3] text-center py-8">No learnings yet</p>
            ) : (
              <div className="space-y-3">
                {doLearnings.map(learning => (
                  <LearningCard key={learning.id} learning={learning} />
                ))}
              </div>
            )}
          </div>

          {/* AVOID column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-medium text-red-700">What to Avoid ({avoidLearnings.length})</h3>
            </div>
            {avoidLearnings.length === 0 ? (
              <p className="text-sm text-[#A3A3A3] text-center py-8">No learnings yet</p>
            ) : (
              <div className="space-y-3">
                {avoidLearnings.map(learning => (
                  <LearningCard key={learning.id} learning={learning} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editingLearning ? 'Edit Learning' : 'Add Learning'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={formType === 'do'}
                      onChange={() => setFormType('do')}
                      className="accent-green-600"
                    />
                    <span className="text-sm text-green-700">DO - What Works</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      checked={formType === 'avoid'}
                      onChange={() => setFormType('avoid')}
                      className="accent-red-600"
                    />
                    <span className="text-sm text-red-700">AVOID - What Doesn't</span>
                  </label>
                </div>

                {/* Insight */}
                <div>
                  <label className="block text-xs text-[#737373] mb-1">Insight</label>
                  <textarea
                    value={formInsight}
                    onChange={(e) => setFormInsight(e.target.value)}
                    placeholder="Describe the learning..."
                    rows={3}
                    className="w-full border border-[#E5E5E5] px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>

                {/* Category & Applies To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full border border-[#E5E5E5] px-3 py-2 text-sm bg-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Applies To</label>
                    <select
                      value={formAppliesTo}
                      onChange={(e) => setFormAppliesTo(e.target.value)}
                      className="w-full border border-[#E5E5E5] px-3 py-2 text-sm bg-white"
                    >
                      {APPLIES_TO_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Confidence */}
                <div>
                  <label className="block text-xs text-[#737373] mb-1">
                    Confidence: {Math.round(formConfidence * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formConfidence * 100}
                    onChange={(e) => setFormConfidence(parseInt(e.target.value) / 100)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E5E5]">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-[#737373] hover:text-black"
                >
                  Cancel
                </button>
                <button
                  onClick={saveLearning}
                  disabled={!formInsight.trim() || isSaving}
                  className="px-4 py-2 text-sm bg-black text-white hover:bg-[#333] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingLearning ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
