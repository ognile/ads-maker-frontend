import { useState, useEffect, useMemo } from 'react'
import { X, Search, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import type { AdConcept } from '../App'

import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface FBCampaign {
  id: string
  name: string
  status: string
  objective: string
}

interface BulkPushResult {
  concept_id: string
  success: boolean
  ad_id?: string
  adset_id?: string
  adset_name?: string
  error?: string
}

interface BulkPushModalProps {
  conceptIds: string[]
  concepts: AdConcept[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkPushModal({ conceptIds, concepts, onClose, onSuccess }: BulkPushModalProps) {
  // Campaign selection
  const [campaigns, setCampaigns] = useState<FBCampaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [campaignSearch, setCampaignSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<FBCampaign | null>(null)

  // Link URL
  const [linkUrl, setLinkUrl] = useState('')

  // Ad status (ACTIVE or PAUSED)
  const [adStatus, setAdStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')

  // Push state
  const [isPushing, setIsPushing] = useState(false)
  const [pushResults, setPushResults] = useState<BulkPushResult[] | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  // Only approved concepts can be pushed
  const approvedConcepts = useMemo(() =>
    concepts.filter(c => c.status === 'approved'),
    [concepts]
  )

  // Load campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [])

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

  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns
    const search = campaignSearch.toLowerCase()
    return campaigns.filter(c => c.name.toLowerCase().includes(search))
  }, [campaigns, campaignSearch])


  const handlePush = async () => {
    if (!selectedCampaign || !linkUrl.trim() || approvedConcepts.length === 0) return

    setIsPushing(true)
    setPushError(null)
    setPushResults(null)

    try {
      const res = await authFetch(`${API_BASE}/fb/bulk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept_ids: approvedConcepts.map(c => c.id),
          campaign_id: selectedCampaign.id,
          link_url: linkUrl.trim(),
          status: adStatus,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to push concepts')
      }

      const data = await res.json()
      setPushResults(data.results || [])

      // Check if all succeeded
      const allSuccess = data.results?.every((r: BulkPushResult) => r.success)
      if (allSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setPushError(err.message || 'Failed to push')
    } finally {
      setIsPushing(false)
    }
  }

  const successCount = pushResults?.filter(r => r.success).length || 0
  const failCount = pushResults?.filter(r => !r.success).length || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg m-4 max-h-[90vh] flex flex-col rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] flex-shrink-0">
          <div>
            <h3 className="font-medium">Push {approvedConcepts.length} Concept{approvedConcepts.length !== 1 ? 's' : ''} to Facebook</h3>
            {approvedConcepts.length < conceptIds.length && (
              <p className="text-xs text-[#A3A3A3]">
                {conceptIds.length - approvedConcepts.length} non-approved concept{conceptIds.length - approvedConcepts.length !== 1 ? 's' : ''} skipped
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Results view */}
          {pushResults ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                {successCount > 0 && (
                  <span className="text-sm text-green-600">{successCount} succeeded</span>
                )}
                {failCount > 0 && (
                  <span className="text-sm text-red-600">{failCount} failed</span>
                )}
              </div>
              {pushResults.map((result) => {
                const concept = concepts.find(c => c.id === result.concept_id)
                return (
                  <div
                    key={result.concept_id}
                    className={`p-3 border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{concept?.batch_number}</span>
                    </div>
                    {result.success && result.adset_name && (
                      <p className="text-xs text-green-700 mt-1 ml-6">Ad Set: {result.adset_name}</p>
                    )}
                    {!result.success && result.error && (
                      <p className="text-xs text-red-600 mt-1 ml-6">{result.error}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {/* Campaign Selection */}
              <div>
                <label className="text-xs text-[#737373] block mb-2">Campaign</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
                  <input
                    type="text"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    placeholder="Search campaigns..."
                    className="w-full h-9 pl-10 pr-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                  />
                </div>

                {isLoadingCampaigns ? (
                  <div className="py-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#A3A3A3]" />
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {filteredCampaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign)}
                        className={`w-full p-2 border text-left text-sm transition-colors ${
                          selectedCampaign?.id === campaign.id
                            ? 'border-black bg-[#FAFAFA]'
                            : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                        }`}
                      >
                        <p className="truncate">{campaign.name}</p>
                      </button>
                    ))}
                    {filteredCampaigns.length === 0 && (
                      <p className="text-xs text-[#A3A3A3] text-center py-2">No campaigns found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Ad Status */}
              <div>
                <label className="text-xs text-[#737373] block mb-2">Ad Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdStatus('ACTIVE')}
                    className={`flex-1 h-9 text-sm border ${
                      adStatus === 'ACTIVE'
                        ? 'border-black bg-black text-white'
                        : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                    }`}
                  >
                    ACTIVE
                  </button>
                  <button
                    onClick={() => setAdStatus('PAUSED')}
                    className={`flex-1 h-9 text-sm border ${
                      adStatus === 'PAUSED'
                        ? 'border-black bg-black text-white'
                        : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                    }`}
                  >
                    PAUSED
                  </button>
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="text-xs text-[#737373] block mb-2">Link URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/landing-page"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
              </div>

              {/* Concepts to Push */}
              <div>
                <label className="text-xs text-[#737373] block mb-2">Concepts ({approvedConcepts.length})</label>
                <div className="space-y-1 max-h-[100px] overflow-y-auto">
                  {approvedConcepts.map((concept) => (
                    <div key={concept.id} className="flex items-center gap-2 text-sm text-[#737373]">
                      <Check className="w-3 h-3 text-green-600" />
                      <span>{concept.batch_number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-[#FFFBEB] border border-[#FCD34D] rounded">
                <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#92400E]">
                    This will create <span className="font-medium">{approvedConcepts.length} new ad set{approvedConcepts.length !== 1 ? 's' : ''}</span> and ads in <span className="font-medium">{adStatus}</span> status.
                  </p>
                </div>
              </div>

              {pushError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600">{pushError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[#E5E5E5] flex-shrink-0">
          {pushResults ? (
            <Button onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePush}
                disabled={!selectedCampaign || !linkUrl.trim() || approvedConcepts.length === 0 || isPushing}
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  `Push ${approvedConcepts.length} Concept${approvedConcepts.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
