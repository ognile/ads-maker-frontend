import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, RefreshCw, Loader2, Copy } from 'lucide-react'
import { Button } from './ui/button'

import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  created_time: string
}

interface AdSet {
  id: string
  name: string
  status: string
  daily_budget: string
  optimization_goal?: string
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [adsetsByCampaign, setAdsetsByCampaign] = useState<Record<string, AdSet[]>>({})
  const [loadingAdsets, setLoadingAdsets] = useState<Set<string>>(new Set())
  const [adsetErrors, setAdsetErrors] = useState<Record<string, string>>({})
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Duplicate adset state
  const [duplicateModal, setDuplicateModal] = useState<{ adset: AdSet; campaignId: string } | null>(null)
  const [newAdsetName, setNewAdsetName] = useState('')
  const [newAdsetBudget, setNewAdsetBudget] = useState('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  useEffect(() => {
    // Only fetch on first mount if no cached data
    if (campaigns.length === 0) {
      fetchCampaigns()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = async (forceRefresh: boolean = false) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch(`${API_BASE}/fb/campaigns${forceRefresh ? '?refresh=true' : ''}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to fetch campaigns')
      }
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      setLastRefreshed(new Date())
    } catch (err: any) {
      console.error('Failed to load campaigns:', err)
      setError(err.message || 'Failed to load campaigns. Check your Facebook connection in Settings.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAdsets = async (campaignId: string, forceRefresh: boolean = false) => {
    setLoadingAdsets(prev => new Set(prev).add(campaignId))
    setAdsetErrors(prev => ({ ...prev, [campaignId]: '' }))
    try {
      const res = await authFetch(`${API_BASE}/fb/adsets?campaign_id=${campaignId}${forceRefresh ? '&refresh=true' : ''}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Show actual error - don't hide it
        throw new Error(data.detail || 'Failed to load ad sets')
      }
      const data = await res.json()
      setAdsetsByCampaign(prev => ({ ...prev, [campaignId]: data.adsets || [] }))
    } catch (err: any) {
      console.error('Failed to load adsets:', err)
      setAdsetErrors(prev => ({ ...prev, [campaignId]: err.message || 'Failed to load' }))
    } finally {
      setLoadingAdsets(prev => {
        const next = new Set(prev)
        next.delete(campaignId)
        return next
      })
    }
  }

  const toggleExpand = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      if (next.has(campaignId)) {
        next.delete(campaignId)
      } else {
        next.add(campaignId)
        if (!adsetsByCampaign[campaignId]) {
          fetchAdsets(campaignId)
        }
      }
      return next
    })
  }

  const handleDuplicate = async () => {
    if (!duplicateModal || !newAdsetName.trim()) return
    setIsDuplicating(true)
    try {
      const res = await authFetch(`${API_BASE}/fb/adsets/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_adset_id: duplicateModal.adset.id,
          new_name: newAdsetName.trim(),
          daily_budget: newAdsetBudget ? parseInt(newAdsetBudget) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to duplicate adset')

      // Refresh adsets for this campaign
      await fetchAdsets(duplicateModal.campaignId)
      setDuplicateModal(null)
      setNewAdsetName('')
      setNewAdsetBudget('')
    } catch (err) {
      console.error('Failed to duplicate adset:', err)
    } finally {
      setIsDuplicating(false)
    }
  }

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    let result = campaigns

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(query))
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    return result
  }, [campaigns, searchQuery, statusFilter])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full h-9 pl-10 pr-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-[#A3A3A3]">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchCampaigns(true)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Campaign List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#A3A3A3]" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <p className="text-xs text-[#A3A3A3]">Go to Settings to connect Facebook</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#A3A3A3]">
              {campaigns.length === 0 ? 'No campaigns found' : 'No campaigns match your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCampaigns.map((campaign) => {
              const isExpanded = expandedCampaigns.has(campaign.id)
              const adsets = adsetsByCampaign[campaign.id] || []
              const isLoadingAdsets = loadingAdsets.has(campaign.id)
              const adsetError = adsetErrors[campaign.id]

              return (
                <div key={campaign.id} className="border border-[#E5E5E5]">
                  {/* Campaign Row */}
                  <button
                    onClick={() => toggleExpand(campaign.id)}
                    className="w-full p-4 text-left hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 mt-0.5 text-[#737373]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-0.5 text-[#737373]" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 ${
                            campaign.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : campaign.status === 'PAUSED'
                              ? 'bg-[#F5F5F5] text-[#737373]'
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {campaign.status}
                          </span>
                          {adsets.length > 0 && (
                            <span className="text-xs text-[#A3A3A3]">
                              {adsets.length} adsets
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded AdSets */}
                  {isExpanded && (
                    <div className="border-t border-[#E5E5E5] bg-[#FAFAFA]">
                      {isLoadingAdsets ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#A3A3A3]" />
                        </div>
                      ) : adsetError ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-red-500">{adsetError}</p>
                        </div>
                      ) : adsets.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-[#A3A3A3]">No ad sets in this campaign</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E5E5E5]">
                          {adsets.map((adset) => (
                            <div key={adset.id} className="p-4 pl-12 flex items-center justify-between">
                              <div>
                                <p className="text-sm">{adset.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-1.5 py-0.5 ${
                                    adset.status === 'ACTIVE'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-[#E5E5E5] text-[#737373]'
                                  }`}>
                                    {adset.status}
                                  </span>
                                  <span className="text-xs text-[#A3A3A3]">
                                    ${((parseInt(adset.daily_budget) || 0) / 100).toFixed(2)}/day
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDuplicateModal({ adset, campaignId: campaign.id })
                                  setNewAdsetName(`${adset.name} - Copy`)
                                  setNewAdsetBudget(adset.daily_budget || '')
                                }}
                                className="p-2 text-[#A3A3A3] hover:text-black"
                                title="Duplicate this ad set"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Duplicate Modal */}
      {duplicateModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-md m-4">
            <div className="p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Duplicate Ad Set</h3>
              <p className="text-sm text-[#737373] mt-1">
                Copying: {duplicateModal.adset.name}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-[#737373] block mb-1">New Name</label>
                <input
                  type="text"
                  value={newAdsetName}
                  onChange={(e) => setNewAdsetName(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-xs text-[#737373] block mb-1">Daily Budget (cents, optional)</label>
                <input
                  type="number"
                  value={newAdsetBudget}
                  onChange={(e) => setNewAdsetBudget(e.target.value)}
                  placeholder="Keep same budget"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDuplicateModal(null)
                    setNewAdsetName('')
                    setNewAdsetBudget('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleDuplicate}
                  disabled={!newAdsetName.trim() || isDuplicating}
                >
                  {isDuplicating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Duplicate'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
