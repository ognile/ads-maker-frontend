import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { RefreshCw, Plus, ThumbsUp, ThumbsDown, Trash2, Edit2, X, Video, Image as ImageIcon, MessageSquare, Sparkles, Play, ChevronDown, ChevronUp, DollarSign, Target, TrendingUp, Loader2 } from 'lucide-react'
import { API_BASE } from '../config'
import { getCachedAds, type CachedAd } from '../utils/analyticsCache'

interface AdMetric {
  ad_name: string
  spend: number
  cpa: number | null
  roas: number | null
}

interface Evidence {
  ad_ids?: string[]
  ad_names?: string[]
  ad_metrics?: AdMetric[]
  metrics_comparison?: string
  specific_examples?: string[]
  supporting_ads?: string[]
}

interface Learning {
  id: string
  insight: string
  category: string
  type: 'do' | 'avoid'
  confidence: number
  applies_to: string
  product_id: string | null
  evidence: Evidence | null
  is_active: boolean
  created_at: string
  source_type?: string
}

interface LearningsResponse {
  learnings: Learning[]
  total: number
}

interface AnalysisResult {
  success: boolean
  ads_analyzed: number
  winners: number
  losers: number
  learnings_created: number
  summary: string
}

interface AdForSelection {
  id: string
  name: string
  thumbnail_url?: string
  primary_text?: string
  spend?: number
  cpa?: number
  roas?: number
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
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  // Analysis modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [availableAds, setAvailableAds] = useState<AdForSelection[]>([])
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set())
  const [isLoadingAds, setIsLoadingAds] = useState(false)
  const [adSearchQuery, setAdSearchQuery] = useState('')

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

  const loadAdsFromCache = () => {
    // First try to get from analytics cache (instant, no API call)
    const cachedAds = getCachedAds()
    if (cachedAds.length > 0) {
      const ads: AdForSelection[] = cachedAds.map((ad: CachedAd) => ({
        id: ad.id,
        name: ad.name || '',
        thumbnail_url: ad.thumbnail_url,
        primary_text: ad.primary_text || '',
        spend: ad.insights?.spend ? parseFloat(String(ad.insights.spend)) : 0,
        cpa: ad.insights?.cost_per_purchase ? parseFloat(String(ad.insights.cost_per_purchase)) : undefined,
        roas: ad.insights?.roas ? parseFloat(String(ad.insights.roas)) : undefined,
      }))
      // Sort by spend descending
      ads.sort((a, b) => (b.spend || 0) - (a.spend || 0))
      setAvailableAds(ads)
      return true
    }
    return false
  }

  const fetchAdsFromApi = async () => {
    setIsLoadingAds(true)
    try {
      // Fetch last 60 days of ads
      const res = await fetch(`${API_BASE}/fb/ads/with-insights?date_preset=last_30d&limit=200`)
      if (res.ok) {
        const data = await res.json()
        const ads: AdForSelection[] = data.map((ad: any) => ({
          id: ad.id,
          name: ad.name || '',
          thumbnail_url: ad.thumbnail_url,
          primary_text: ad.primary_text || '',
          spend: ad.spend ? parseFloat(ad.spend) : 0,
          cpa: ad.cpa ? parseFloat(ad.cpa) : undefined,
          roas: ad.roas ? parseFloat(ad.roas) : undefined,
        }))
        // Sort by spend descending
        ads.sort((a, b) => (b.spend || 0) - (a.spend || 0))
        setAvailableAds(ads)
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error)
    } finally {
      setIsLoadingAds(false)
    }
  }

  // Load ads when modal opens - try cache first, fallback to API
  useEffect(() => {
    if (showAnalysisModal && availableAds.length === 0) {
      const loadedFromCache = loadAdsFromCache()
      if (!loadedFromCache) {
        fetchAdsFromApi()
      }
    }
  }, [showAnalysisModal])

  const runAnalysis = async () => {
    const adIds = Array.from(selectedAdIds)

    if (adIds.length === 0) {
      alert('Please select at least one ad')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null)

    try {
      const res = await fetch(`${API_BASE}/analysis/analyze-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_ids: adIds }),
      })

      if (res.ok) {
        const data = await res.json()
        setAnalysisResult(data)
        fetchLearnings()
      } else {
        const error = await res.json()
        alert(`Analysis failed: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Analysis failed. Check console for details.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleAdSelection = (adId: string) => {
    setSelectedAdIds(prev => {
      const next = new Set(prev)
      if (next.has(adId)) {
        next.delete(adId)
      } else {
        next.add(adId)
      }
      return next
    })
  }

  const filteredAds = availableAds.filter(ad =>
    adSearchQuery === '' ||
    ad.name.toLowerCase().includes(adSearchQuery.toLowerCase()) ||
    ad.primary_text?.toLowerCase().includes(adSearchQuery.toLowerCase())
  )

  // Extract batch number from ad name (e.g., "B0104--Nuora..." -> "B0104")
  const getBatchNumber = (name: string) => {
    const match = name.match(/^([A-Z]+\d+)/i)
    return match ? match[1] : name.slice(0, 10)
  }

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
        await fetch(`${API_BASE}/analysis/learnings/${editingLearning.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
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
    if (!confirm('Delete this learning?')) return

    try {
      await fetch(`${API_BASE}/analysis/learnings/${id}/hard`, { method: 'DELETE' })
      fetchLearnings()
    } catch (error) {
      console.error('Failed to delete learning:', error)
    }
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<{ element: HTMLElement; topBefore: number } | null>(null)

  const toggleEvidence = useCallback((id: string, event: React.MouseEvent) => {
    const clickedElement = event.currentTarget as HTMLElement
    // Store element and its position BEFORE state change
    pendingScrollRef.current = {
      element: clickedElement,
      topBefore: clickedElement.getBoundingClientRect().top
    }

    setExpandedEvidence(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Restore scroll position after expand/collapse
  useLayoutEffect(() => {
    if (pendingScrollRef.current && scrollContainerRef.current) {
      const { element, topBefore } = pendingScrollRef.current
      const topAfter = element.getBoundingClientRect().top
      const diff = topAfter - topBefore

      if (Math.abs(diff) > 5) {
        scrollContainerRef.current.scrollTop += diff
      }
      pendingScrollRef.current = null
    }
  }, [expandedEvidence])

  const doLearnings = learnings.filter(l => l.type === 'do')
  const avoidLearnings = learnings.filter(l => l.type === 'avoid')

  const LearningCard = ({ learning }: { learning: Learning }) => {
    const hasEvidence = learning.evidence && (
      learning.evidence.ad_names?.length ||
      learning.evidence.specific_examples?.length ||
      learning.evidence.metrics_comparison
    )
    const isExpanded = expandedEvidence.has(learning.id)

    return (
      <div className="border border-[#E5E5E5] bg-white">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm flex-1 leading-relaxed">{learning.insight}</p>
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
              {Math.round(learning.confidence * 100)}%
            </span>
            {(learning.source_type === 'analysis' || learning.source_type === 'comparison') && (
              <span className="px-1.5 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200">
                data-backed
              </span>
            )}
          </div>

          {hasEvidence && (
            <button
              onClick={(e) => toggleEvidence(learning.id, e)}
              className="flex items-center gap-1 text-xs text-[#737373] hover:text-black"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {learning.evidence?.ad_names?.length || 0} supporting ads
            </button>
          )}
        </div>

        {hasEvidence && isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-[#E5E5E5] mt-0 bg-[#FAFAFA]">
            <div className="pt-3 space-y-3">
              {learning.evidence?.metrics_comparison && (
                <div className="text-xs">
                  <span className="text-[#737373]">Metrics: </span>
                  <span>{learning.evidence.metrics_comparison}</span>
                </div>
              )}

              {learning.evidence?.ad_metrics && learning.evidence.ad_metrics.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-[#737373]">Supporting Ads:</span>
                  {learning.evidence.ad_metrics.map((ad, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs bg-white p-2 border border-[#E5E5E5]">
                      <span className="font-medium truncate flex-1" title={ad.ad_name}>
                        {ad.ad_name.length > 40 ? ad.ad_name.slice(0, 40) + '...' : ad.ad_name}
                      </span>
                      <div className="flex items-center gap-3 text-[#737373] flex-shrink-0">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {ad.spend?.toFixed(0) || '0'}
                        </span>
                        {ad.cpa && (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            ${ad.cpa.toFixed(2)}
                          </span>
                        )}
                        {ad.roas && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {ad.roas.toFixed(2)}x
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {learning.evidence?.specific_examples && learning.evidence.specific_examples.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-[#737373]">Examples:</span>
                  {learning.evidence.specific_examples.map((ex, i) => (
                    <div key={i} className="text-xs italic text-[#525252] bg-white p-2 border-l-2 border-[#E5E5E5]">
                      "{ex}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-[#A3A3A3]">Loading learnings...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
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
              onClick={() => setShowAnalysisModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-black text-black hover:bg-black hover:text-white transition-colors"
            >
              <Play className="w-4 h-4" />
              Run Analysis
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-black text-white hover:bg-[#333]"
            >
              <Plus className="w-4 h-4" />
              Add Manual
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
              <p className="text-sm text-[#A3A3A3] text-center py-8">No learnings yet. Run analysis to generate.</p>
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
              <p className="text-sm text-[#A3A3A3] text-center py-8">No learnings yet. Run analysis to generate.</p>
            ) : (
              <div className="space-y-3">
                {avoidLearnings.map(learning => (
                  <LearningCard key={learning.id} learning={learning} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analysis Modal */}
        {showAnalysisModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
                <h3 className="text-lg font-semibold">Select Ads to Analyze</h3>
                <button onClick={() => { setShowAnalysisModal(false); setSelectedAdIds(new Set()); setAnalysisResult(null) }} className="p-1 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!analysisResult ? (
                <>
                  {/* Search */}
                  <div className="p-4 border-b border-[#E5E5E5]">
                    <input
                      type="text"
                      placeholder="Search ads by name or text..."
                      value={adSearchQuery}
                      onChange={(e) => setAdSearchQuery(e.target.value)}
                      className="w-full border border-[#E5E5E5] px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-[#737373]">
                        {selectedAdIds.size} selected • Mix winners and losers for best results
                      </span>
                      {selectedAdIds.size > 0 && (
                        <button
                          onClick={() => setSelectedAdIds(new Set())}
                          className="text-xs text-[#737373] hover:text-black"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ad List */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {isLoadingAds ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[#A3A3A3]" />
                      </div>
                    ) : filteredAds.length === 0 ? (
                      <p className="text-sm text-[#A3A3A3] text-center py-8">No ads found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAds.map(ad => {
                          const isSelected = selectedAdIds.has(ad.id)
                          return (
                            <button
                              key={ad.id}
                              onClick={() => toggleAdSelection(ad.id)}
                              className={`w-full flex items-start gap-3 p-3 border transition-colors text-left ${
                                isSelected
                                  ? 'border-black bg-[#FAFAFA]'
                                  : 'border-[#E5E5E5] hover:border-[#A3A3A3]'
                              }`}
                            >
                              {/* Checkbox */}
                              <div className={`w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center ${
                                isSelected ? 'bg-black border-black' : 'border-[#D4D4D4]'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>

                              {/* Thumbnail */}
                              <div className="w-12 h-12 bg-[#F5F5F5] flex-shrink-0 overflow-hidden">
                                {ad.thumbnail_url ? (
                                  <img src={ad.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#A3A3A3]">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{getBatchNumber(ad.name)}</span>
                                  {ad.cpa && ad.cpa < 50 && (
                                    <span className="text-xs px-1 bg-green-100 text-green-700">CPA ${ad.cpa.toFixed(0)}</span>
                                  )}
                                  {ad.cpa && ad.cpa >= 50 && (
                                    <span className="text-xs px-1 bg-red-100 text-red-700">CPA ${ad.cpa.toFixed(0)}</span>
                                  )}
                                </div>
                                <p className="text-xs text-[#737373] truncate mt-0.5">
                                  {ad.primary_text?.slice(0, 80) || 'No primary text'}
                                  {ad.primary_text && ad.primary_text.length > 80 ? '...' : ''}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-[#A3A3A3]">
                                  <span>${ad.spend?.toFixed(0) || '0'} spent</span>
                                  {ad.roas && <span>{ad.roas.toFixed(1)}x ROAS</span>}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-2 p-4 border-t border-[#E5E5E5]">
                    <button
                      onClick={() => { setShowAnalysisModal(false); setSelectedAdIds(new Set()) }}
                      className="px-4 py-2 text-sm text-[#737373] hover:text-black"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={runAnalysis}
                      disabled={isAnalyzing || selectedAdIds.size === 0}
                      className="px-4 py-2 text-sm bg-black text-white hover:bg-[#333] disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing {selectedAdIds.size} ads...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Analyze {selectedAdIds.size} Ads
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 text-green-800">
                    <div className="font-medium mb-2">Analysis Complete</div>
                    <div className="text-sm space-y-1">
                      <p>{analysisResult.ads_analyzed} ads analyzed</p>
                      <p>{analysisResult.winners} winners, {analysisResult.losers} losers</p>
                      <p className="font-medium">{analysisResult.learnings_created} learnings extracted</p>
                    </div>
                  </div>

                  {analysisResult.summary && (
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Summary</label>
                      <p className="text-sm">{analysisResult.summary}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E5E5]">
                    <button
                      onClick={() => {
                        setAnalysisResult(null)
                        setSelectedAdIds(new Set())
                      }}
                      className="px-4 py-2 text-sm text-[#737373] hover:text-black"
                    >
                      Analyze More
                    </button>
                    <button
                      onClick={() => {
                        setShowAnalysisModal(false)
                        setAnalysisResult(null)
                        setSelectedAdIds(new Set())
                      }}
                      className="px-4 py-2 text-sm bg-black text-white hover:bg-[#333]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Manual Learning Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editingLearning ? 'Edit Learning' : 'Add Manual Learning'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
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
