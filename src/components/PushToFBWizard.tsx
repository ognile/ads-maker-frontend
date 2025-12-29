import { useState, useEffect, useMemo } from 'react'
import { X, Search, ChevronRight, ChevronLeft, Loader2, Plus, Copy, AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import type { AdConcept, Product } from '../App'

import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface FBCampaign {
  id: string
  name: string
  status: string
  objective: string
}

interface FBAdSet {
  id: string
  name: string
  status: string
  daily_budget: string
  targeting?: any
  optimization_goal?: string
}

interface PushToFBWizardProps {
  concept: AdConcept
  product?: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PushToFBWizard({ concept, product, isOpen, onClose, onSuccess }: PushToFBWizardProps) {
  const [step, setStep] = useState(1)

  // Step 1: Campaign selection
  const [campaigns, setCampaigns] = useState<FBCampaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [campaignSearch, setCampaignSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<FBCampaign | null>(null)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

  // Step 2: AdSet selection
  const [adsets, setAdsets] = useState<FBAdSet[]>([])
  const [isLoadingAdsets, setIsLoadingAdsets] = useState(false)
  const [adsetError, setAdsetError] = useState<string | null>(null)
  const [selectedAdset, setSelectedAdset] = useState<FBAdSet | null>(null)
  const [showNewAdset, setShowNewAdset] = useState(false)
  const [showDuplicateAdset, setShowDuplicateAdset] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState<FBAdSet | null>(null)
  const [newAdsetName, setNewAdsetName] = useState('')
  const [newAdsetBudget, setNewAdsetBudget] = useState('500')
  const [isCreatingAdset, setIsCreatingAdset] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [isCBO, setIsCBO] = useState(false)

  // Suggested naming
  const [suggestedAdsetName, setSuggestedAdsetName] = useState('')
  const [hasNamingData, setHasNamingData] = useState(false)

  // Step 3: Push
  const [isPushing, setIsPushing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  // Load campaigns and suggested names on open
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns()
      fetchSuggestedNames()
      // Pre-fill link URL from product
      if (product?.landing_page_url) {
        setLinkUrl(product.landing_page_url)
      }
    }
  }, [isOpen, product])

  const fetchSuggestedNames = async () => {
    try {
      const lp = product?.landing_page_url || ''
      const res = await authFetch(`${API_BASE}/fb/concept/${concept.id}/suggested-names?link_url=${encodeURIComponent(lp)}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestedAdsetName(data.adset_name || '')
        setHasNamingData(data.has_naming_data || false)
        // Pre-fill the adset name if we have naming data
        if (data.has_naming_data && data.adset_name) {
          setNewAdsetName(data.adset_name)
        }
      }
    } catch (err) {
      console.error('Failed to fetch suggested names:', err)
    }
  }

  // Load adsets when campaign selected
  useEffect(() => {
    if (selectedCampaign) {
      fetchAdsets(selectedCampaign.id)
    }
  }, [selectedCampaign])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSelectedCampaign(null)
      setSelectedAdset(null)
      setCampaignSearch('')
      setShowNewCampaign(false)
      setShowNewAdset(false)
      setShowDuplicateAdset(false)
      setDuplicateSource(null)
      setPushError(null)
      setAdsetError(null)
      setAdsets([])
      setSuggestedAdsetName('')
      setHasNamingData(false)
      setNewAdsetName('')
    }
  }, [isOpen])

  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true)
    try {
      const res = await authFetch(`${API_BASE}/fb/campaigns`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    } finally {
      setIsLoadingCampaigns(false)
    }
  }

  const fetchAdsets = async (campaignId: string) => {
    setIsLoadingAdsets(true)
    setAdsetError(null)
    try {
      // Fetch adsets and check if campaign is CBO in parallel
      const [adsetsRes, budgetRes] = await Promise.all([
        authFetch(`${API_BASE}/fb/adsets?campaign_id=${campaignId}`),
        authFetch(`${API_BASE}/fb/campaigns/${campaignId}/budget-type`).catch(() => null)
      ])

      if (!adsetsRes.ok) {
        const data = await adsetsRes.json().catch(() => ({}))
        const isRateLimit = data.detail?.includes('rate') || data.detail?.includes('limit') || data.detail?.includes('Too Many')
        throw new Error(isRateLimit ? 'Rate limit hit - wait a moment and try again' : 'Failed to fetch adsets')
      }
      const data = await adsetsRes.json()
      setAdsets(data.adsets || [])

      // Check if CBO
      if (budgetRes && budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setIsCBO(budgetData.is_cbo || false)
      }
    } catch (err: any) {
      console.error('Failed to load adsets:', err)
      setAdsetError(err.message || 'Failed to load adsets')
    } finally {
      setIsLoadingAdsets(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return
    setIsCreatingCampaign(true)
    try {
      const res = await authFetch(`${API_BASE}/fb/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create campaign')
      const data = await res.json()

      // Refresh campaigns and select new one
      await fetchCampaigns()
      const newCampaign = campaigns.find(c => c.id === data.campaign_id)
      if (newCampaign) {
        setSelectedCampaign(newCampaign)
      }
      setNewCampaignName('')
      setShowNewCampaign(false)
    } catch (err) {
      console.error('Failed to create campaign:', err)
    } finally {
      setIsCreatingCampaign(false)
    }
  }

  const handleCreateAdset = async () => {
    if (!newAdsetName.trim() || !selectedCampaign) return
    setIsCreatingAdset(true)
    const adsetNameToCreate = newAdsetName.trim()
    const budgetToCreate = isCBO ? 100 : (parseInt(newAdsetBudget) || 500)

    try {
      const res = await authFetch(`${API_BASE}/fb/adsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          name: adsetNameToCreate,
          daily_budget: budgetToCreate,
        }),
      })
      if (!res.ok) throw new Error('Failed to create adset')
      const data = await res.json()
      const newAdsetId = data.adset_id

      // OPTIMISTIC UPDATE: Add the new adset to the list immediately
      // Facebook's API may not return it immediately due to eventual consistency
      const optimisticAdset: FBAdSet = {
        id: newAdsetId,
        name: adsetNameToCreate,
        status: 'PAUSED',
        daily_budget: String(budgetToCreate),
      }

      // Add to list and auto-select
      setAdsets(prev => [optimisticAdset, ...prev])
      setSelectedAdset(optimisticAdset)

      // Also fetch from API in background to sync any other changes
      // but don't block the UI on it
      authFetch(`${API_BASE}/fb/adsets?campaign_id=${selectedCampaign.id}&refresh=true`)
        .then(async (adsetsRes) => {
          if (adsetsRes.ok) {
            const adsetsData = await adsetsRes.json()
            const freshAdsets = adsetsData.adsets || []
            // Only update if the new adset is in the list (Facebook caught up)
            // Otherwise keep our optimistic version
            const hasNewAdset = freshAdsets.some((a: FBAdSet) => a.id === newAdsetId)
            if (hasNewAdset) {
              setAdsets(freshAdsets)
            }
          }
        })
        .catch(() => {}) // Ignore background refresh errors

      setNewAdsetName('')
      setNewAdsetBudget('500')
      setShowNewAdset(false)
    } catch (err) {
      console.error('Failed to create adset:', err)
    } finally {
      setIsCreatingAdset(false)
    }
  }

  const handleDuplicateAdset = async () => {
    if (!duplicateSource || !newAdsetName.trim()) return
    setIsCreatingAdset(true)
    const adsetNameToCreate = newAdsetName.trim()
    const budgetToCreate = isCBO ? undefined : (parseInt(newAdsetBudget) || undefined)

    try {
      const res = await authFetch(`${API_BASE}/fb/adsets/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_adset_id: duplicateSource.id,
          new_name: adsetNameToCreate,
          daily_budget: budgetToCreate,
        }),
      })
      if (!res.ok) throw new Error('Failed to duplicate adset')
      const data = await res.json()
      const newAdsetId = data.adset_id

      // OPTIMISTIC UPDATE: Add the new adset to the list immediately
      const optimisticAdset: FBAdSet = {
        id: newAdsetId,
        name: adsetNameToCreate,
        status: 'PAUSED',
        daily_budget: String(budgetToCreate || duplicateSource.daily_budget || '500'),
      }

      // Add to list and auto-select
      setAdsets(prev => [optimisticAdset, ...prev])
      setSelectedAdset(optimisticAdset)

      // Background refresh to sync
      if (selectedCampaign) {
        authFetch(`${API_BASE}/fb/adsets?campaign_id=${selectedCampaign.id}&refresh=true`)
          .then(async (adsetsRes) => {
            if (adsetsRes.ok) {
              const adsetsData = await adsetsRes.json()
              const freshAdsets = adsetsData.adsets || []
              const hasNewAdset = freshAdsets.some((a: FBAdSet) => a.id === newAdsetId)
              if (hasNewAdset) {
                setAdsets(freshAdsets)
              }
            }
          })
          .catch(() => {})
      }

      setNewAdsetName('')
      setNewAdsetBudget('500')
      setShowDuplicateAdset(false)
      setDuplicateSource(null)
    } catch (err) {
      console.error('Failed to duplicate adset:', err)
    } finally {
      setIsCreatingAdset(false)
    }
  }

  const handlePush = async () => {
    if (!selectedAdset || !linkUrl.trim()) return
    setIsPushing(true)
    setPushError(null)
    try {
      const res = await authFetch(`${API_BASE}/fb/push-concept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_id: concept.id,
          adset_id: selectedAdset.id,
          link_url: linkUrl.trim(),
          primary_text_index: 0,
          headline_index: 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to push to Facebook')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      setPushError(err.message || 'Failed to push')
    } finally {
      setIsPushing(false)
    }
  }

  // Filtered campaigns by search
  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns
    const search = campaignSearch.toLowerCase()
    return campaigns.filter(c => c.name.toLowerCase().includes(search))
  }, [campaigns, campaignSearch])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white border border-[#E5E5E5] w-full max-w-lg m-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] flex-shrink-0">
          <div>
            <h3 className="font-medium">Push to Facebook</h3>
            <p className="text-xs text-[#A3A3A3]">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Campaign */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                <input
                  type="text"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="w-full h-10 pl-10 pr-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              {showNewCampaign ? (
                <div className="border border-[#E5E5E5] p-4 space-y-3">
                  <p className="text-sm font-medium">Create New Campaign</p>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Campaign name..."
                    className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateCampaign}
                      disabled={!newCampaignName.trim() || isCreatingCampaign}
                    >
                      {isCreatingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowNewCampaign(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCampaign(true)}
                  className="w-full h-10 border border-dashed border-[#E5E5E5] text-sm text-[#737373] hover:border-black hover:text-black flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Campaign
                </button>
              )}

              {isLoadingCampaigns ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#A3A3A3]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredCampaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`w-full p-3 border text-left transition-colors ${
                        selectedCampaign?.id === campaign.id
                          ? 'border-black bg-[#FAFAFA]'
                          : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{campaign.name}</p>
                      <span className={`inline-block text-xs px-1.5 py-0.5 mt-1 ${
                        campaign.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[#F5F5F5] text-[#737373]'
                      }`}>
                        {campaign.status}
                      </span>
                    </button>
                  ))}
                  {filteredCampaigns.length === 0 && !isLoadingCampaigns && (
                    <p className="text-sm text-[#A3A3A3] text-center py-4">No campaigns found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select AdSet */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-[#FAFAFA] p-3 border border-[#E5E5E5]">
                <p className="text-xs text-[#A3A3A3]">Campaign</p>
                <p className="text-sm font-medium truncate">{selectedCampaign?.name}</p>
              </div>

              {showNewAdset || showDuplicateAdset ? (
                <div className="border border-[#E5E5E5] p-4 space-y-3">
                  <p className="text-sm font-medium">
                    {showDuplicateAdset ? `Duplicate: ${duplicateSource?.name}` : 'Create New Ad Set'}
                  </p>
                  {hasNamingData && suggestedAdsetName && !showDuplicateAdset && (
                    <div className="bg-green-50 border border-green-200 p-2 rounded">
                      <p className="text-xs text-green-700 mb-1">Suggested name (from concept):</p>
                      <p className="text-xs font-mono text-green-800 break-all">{suggestedAdsetName}</p>
                      {newAdsetName !== suggestedAdsetName && (
                        <button
                          onClick={() => setNewAdsetName(suggestedAdsetName)}
                          className="text-xs text-green-600 hover:text-green-800 mt-1 underline"
                        >
                          Use suggested name
                        </button>
                      )}
                    </div>
                  )}
                  <input
                    type="text"
                    value={newAdsetName}
                    onChange={(e) => setNewAdsetName(e.target.value)}
                    placeholder="Ad set name..."
                    className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black font-mono text-xs"
                  />
                  {!isCBO && (
                    <div>
                      <label className="text-xs text-[#A3A3A3] block mb-1">Daily Budget (cents)</label>
                      <input
                        type="number"
                        value={newAdsetBudget}
                        onChange={(e) => setNewAdsetBudget(e.target.value)}
                        placeholder="500"
                        className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                      />
                    </div>
                  )}
                  {isCBO && (
                    <p className="text-xs text-[#737373]">
                      Budget managed at campaign level (CBO)
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={showDuplicateAdset ? handleDuplicateAdset : handleCreateAdset}
                      disabled={!newAdsetName.trim() || isCreatingAdset}
                    >
                      {isCreatingAdset ? <Loader2 className="w-4 h-4 animate-spin" /> : showDuplicateAdset ? 'Duplicate' : 'Create'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewAdset(false)
                        setShowDuplicateAdset(false)
                        setDuplicateSource(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : hasNamingData ? (
                <button
                  onClick={() => {
                    setShowNewAdset(true)
                    setNewAdsetName(suggestedAdsetName)
                  }}
                  className="w-full h-12 bg-black text-white text-sm font-medium hover:bg-[#333] flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Ad Set with Naming Convention
                </button>
              ) : (
                <button
                  onClick={() => setShowNewAdset(true)}
                  className="w-full h-10 border border-dashed border-[#E5E5E5] text-sm text-[#737373] hover:border-black hover:text-black flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Ad Set
                </button>
              )}

              {isLoadingAdsets ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#A3A3A3]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {adsets.map((adset) => (
                    <div
                      key={adset.id}
                      className={`p-3 border transition-colors ${
                        selectedAdset?.id === adset.id
                          ? 'border-black bg-[#FAFAFA]'
                          : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => setSelectedAdset(adset)}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-sm font-medium truncate">{adset.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 ${
                              adset.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-[#F5F5F5] text-[#737373]'
                            }`}>
                              {adset.status}
                            </span>
                            <span className="text-xs text-[#A3A3A3]">
                              ${((parseInt(adset.daily_budget) || 0) / 100).toFixed(2)}/day
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setDuplicateSource(adset)
                            setNewAdsetName(`${adset.name} - Copy`)
                            setNewAdsetBudget(adset.daily_budget || '500')
                            setShowDuplicateAdset(true)
                          }}
                          className="p-1.5 text-[#A3A3A3] hover:text-black"
                          title="Duplicate this ad set"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {adsetError && !isLoadingAdsets && (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-500 mb-2">{adsetError}</p>
                      <Button variant="outline" size="sm" onClick={() => selectedCampaign && fetchAdsets(selectedCampaign.id)}>
                        Retry
                      </Button>
                    </div>
                  )}
                  {!adsetError && adsets.length === 0 && !isLoadingAdsets && (
                    <p className="text-sm text-[#A3A3A3] text-center py-4">No ad sets in this campaign</p>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[#E5E5E5]">
                <label className="text-xs text-[#737373] block mb-1">Link URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/landing-page"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
                {product?.landing_page_url && linkUrl !== product.landing_page_url && (
                  <button
                    onClick={() => setLinkUrl(product.landing_page_url!)}
                    className="text-xs text-[#737373] hover:text-black mt-1"
                  >
                    Use product URL: {product.landing_page_url}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Campaign */}
              <div className="border border-[#E5E5E5] p-4">
                <p className="text-xs text-[#A3A3A3] mb-1">CAMPAIGN</p>
                <p className="text-sm font-medium">{selectedCampaign?.name}</p>
                <p className="text-xs text-[#737373] mt-1">
                  Objective: {selectedCampaign?.objective} | Status: {selectedCampaign?.status}
                </p>
              </div>

              {/* AdSet */}
              <div className="border border-[#E5E5E5] p-4">
                <p className="text-xs text-[#A3A3A3] mb-1">AD SET</p>
                <p className="text-sm font-medium">{selectedAdset?.name}</p>
                <p className="text-xs text-[#737373] mt-1">
                  Budget: ${((parseInt(selectedAdset?.daily_budget || '0') || 0) / 100).toFixed(2)}/day
                </p>
              </div>

              {/* Creative Preview */}
              <div className="border border-[#E5E5E5] p-4">
                <p className="text-xs text-[#A3A3A3] mb-3">CREATIVE PREVIEW</p>
                <div className="flex gap-4">
                  {concept.images?.[0] && (
                    <img
                      src={concept.images[0].startsWith('data:') || concept.images[0].startsWith('http') ? concept.images[0] : `data:image/png;base64,${concept.images[0]}`}
                      alt="Ad preview"
                      className="w-20 h-20 object-cover border border-[#E5E5E5]"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="text-xs text-[#A3A3A3]">Primary Text</p>
                      <p className="text-sm line-clamp-2">{concept.primary_texts?.[0]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#A3A3A3]">Headline</p>
                      <p className="text-sm truncate">{concept.headlines?.[0]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#A3A3A3]">Link</p>
                      <p className="text-sm truncate text-[#737373]">{linkUrl}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-[#FFFBEB] border border-[#FCD34D]">
                <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#92400E]">
                  Ad will be created in <span className="font-medium">PAUSED</span> status. You can activate it from Facebook Ads Manager.
                </p>
              </div>

              {pushError && (
                <div className="p-3 bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{pushError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#E5E5E5] flex-shrink-0">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !selectedCampaign) ||
                  (step === 2 && (!selectedAdset || !linkUrl.trim()))
                }
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handlePush} disabled={isPushing}>
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  'Push to Facebook'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
