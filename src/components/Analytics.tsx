import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Bot, User } from 'lucide-react'
import { Button } from './ui/button'

const API_BASE = '/api'
const CACHE_KEY = 'analytics_cache'
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

type DatePreset = 'yesterday' | 'last_7d' | 'last_30d' | 'this_month'

interface Insights {
  spend?: string | number
  impressions?: string | number
  reach?: string | number
  // Link-specific metrics
  link_clicks?: string | number
  link_ctr?: string | number
  link_cpc?: string | number
  // Actions
  landing_page_views?: number
  add_to_cart?: number
  initiate_checkout?: number
  purchases?: number
  // Costs
  cost_per_landing_page_view?: number | null
  cost_per_add_to_cart?: number | null
  cost_per_initiate_checkout?: number | null
  cost_per_purchase?: number | null
  // ROAS
  roas?: number | null
  // Custom calculated
  traffic_quality?: number | null
  atc_purchase_ratio?: number | null
}

interface AdInsights {
  spend?: string | number
  impressions?: string | number
  reach?: string | number
  link_clicks?: string | number
  link_ctr?: string | number
  link_cpc?: string | number
  landing_page_views?: number
  add_to_cart?: number
  initiate_checkout?: number
  purchases?: number
  cost_per_landing_page_view?: number | null
  cost_per_add_to_cart?: number | null
  cost_per_initiate_checkout?: number | null
  cost_per_purchase?: number | null
  roas?: number | null
  traffic_quality?: number | null
  atc_purchase_ratio?: number | null
}

interface Ad {
  id: string
  name: string
  is_ai_generated: boolean
  insights: AdInsights
}

interface CacheData {
  data: Record<DatePreset, {
    insights: Insights | null
    ads: Ad[]
    lastRefreshed: number
  }>
  timestamp: number
}

// Load cache from localStorage
const loadCacheFromStorage = (): Record<DatePreset, { insights: Insights | null; ads: Ad[]; lastRefreshed: number }> => {
  try {
    const saved = localStorage.getItem(CACHE_KEY)
    if (saved) {
      const parsed: CacheData = JSON.parse(saved)
      // Check if cache is still valid (within TTL)
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data
      }
    }
  } catch (e) {
    console.error('Failed to load analytics cache:', e)
  }
  return {} as any
}

// Save cache to localStorage
const saveCacheToStorage = (data: Record<DatePreset, { insights: Insights | null; ads: Ad[]; lastRefreshed: number }>) => {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (e) {
    console.error('Failed to save analytics cache:', e)
  }
}

export function Analytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last_7d')
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingAds, setIsLoadingAds] = useState(false)
  const [sortBy, setSortBy] = useState<'spend' | 'link_ctr' | 'link_cpc' | 'cost_per_purchase' | 'roas'>('spend')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [error, setError] = useState<string | null>(null)

  // Cache per date preset - initialize from localStorage
  const [cache, setCache] = useState<Record<DatePreset, {
    insights: Insights | null
    ads: Ad[]
    lastRefreshed: number
  }>>(() => loadCacheFromStorage())

  // Get current data from cache
  const currentCache = cache[datePreset]
  const accountInsights = currentCache?.insights || null
  const ads = currentCache?.ads || []
  const lastRefreshed = currentCache?.lastRefreshed ? new Date(currentCache.lastRefreshed) : null

  // Save to localStorage whenever cache changes
  useEffect(() => {
    if (Object.keys(cache).length > 0) {
      saveCacheToStorage(cache)
    }
  }, [cache])

  useEffect(() => {
    // Only fetch if no cached data for this preset
    if (!cache[datePreset]) {
      fetchData()
    }
  }, [datePreset]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setIsLoadingInsights(true)
    setIsLoadingAds(true)
    setError(null)

    try {
      const [insightsRes, adsRes] = await Promise.all([
        fetch(`${API_BASE}/fb/account/insights?date_preset=${datePreset}`),
        fetch(`${API_BASE}/fb/ads/with-insights?date_preset=${datePreset}&limit=100`),
      ])

      if (!insightsRes.ok) {
        const data = await insightsRes.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to fetch insights')
      }

      const insightsData = await insightsRes.json()

      let adsResult: Ad[] = []
      if (adsRes.ok) {
        const adsData = await adsRes.json()
        adsResult = adsData.ads || []
      }

      // Update cache for this preset
      setCache(prev => ({
        ...prev,
        [datePreset]: {
          insights: insightsData.insights,
          ads: adsResult,
          lastRefreshed: Date.now(),
        }
      }))
      setIsLoadingInsights(false)
      setIsLoadingAds(false)
    } catch (err: any) {
      console.error('Failed to load analytics:', err)
      setError(err.message || 'Failed to load analytics. Check your Facebook connection in Settings.')
      setIsLoadingInsights(false)
      setIsLoadingAds(false)
    }
  }

  // AI vs Manual comparison
  const comparison = useMemo(() => {
    const aiAds = ads.filter(a => a.is_ai_generated)
    const manualAds = ads.filter(a => !a.is_ai_generated)

    const calcAvg = (adList: Ad[], field: keyof AdInsights) => {
      const values = adList
        .map(a => {
          const val = a.insights?.[field]
          return typeof val === 'number' ? val : parseFloat(String(val || '0'))
        })
        .filter(v => !isNaN(v) && v > 0)
      if (values.length === 0) return 0
      return values.reduce((a, b) => a + b, 0) / values.length
    }

    const calcTotal = (adList: Ad[], field: keyof AdInsights) => {
      return adList
        .map(a => {
          const val = a.insights?.[field]
          return typeof val === 'number' ? val : parseFloat(String(val || '0'))
        })
        .filter(v => !isNaN(v))
        .reduce((a, b) => a + b, 0)
    }

    return {
      ai: {
        count: aiAds.length,
        avgCtr: calcAvg(aiAds, 'link_ctr'),
        avgCpc: calcAvg(aiAds, 'link_cpc'),
        avgCostPerPurchase: calcAvg(aiAds, 'cost_per_purchase'),
        avgRoas: calcAvg(aiAds, 'roas'),
        totalSpend: calcTotal(aiAds, 'spend'),
        totalPurchases: calcTotal(aiAds, 'purchases'),
      },
      manual: {
        count: manualAds.length,
        avgCtr: calcAvg(manualAds, 'link_ctr'),
        avgCpc: calcAvg(manualAds, 'link_cpc'),
        avgCostPerPurchase: calcAvg(manualAds, 'cost_per_purchase'),
        avgRoas: calcAvg(manualAds, 'roas'),
        totalSpend: calcTotal(manualAds, 'spend'),
        totalPurchases: calcTotal(manualAds, 'purchases'),
      },
    }
  }, [ads])

  // Sorted ads
  const sortedAds = useMemo(() => {
    return [...ads].sort((a, b) => {
      const getVal = (ad: Ad) => {
        const val = ad.insights?.[sortBy]
        return typeof val === 'number' ? val : parseFloat(String(val || '0'))
      }
      const aVal = getVal(a)
      const bVal = getVal(b)
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [ads, sortBy, sortOrder])

  const formatCurrency = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '-'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '-'
    return `$${num.toFixed(2)}`
  }

  const formatPercent = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '-'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '-'
    return `${num.toFixed(2)}%`
  }

  const datePresetLabels: Record<DatePreset, string> = {
    yesterday: 'Yesterday',
    last_7d: 'Last 7 Days',
    last_30d: 'Last 30 Days',
    this_month: 'This Month',
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['yesterday', 'last_7d', 'last_30d', 'this_month'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 text-sm border transition-colors ${
                datePreset === preset
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#737373] border-[#E5E5E5] hover:border-black'
              }`}
            >
              {datePresetLabels[preset]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-[#A3A3A3]">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoadingInsights || isLoadingAds}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingInsights || isLoadingAds ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Error State */}
        {error && (
          <div className="py-12 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <p className="text-xs text-[#A3A3A3]">Go to Settings to connect Facebook</p>
          </div>
        )}

        {/* Account Overview */}
        {!error && (
        <>
        <div>
          <h2 className="text-sm font-medium text-[#737373] mb-3">ACCOUNT OVERVIEW</h2>
          {isLoadingInsights ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#A3A3A3]" />
            </div>
          ) : !accountInsights ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#A3A3A3]">No data available for this period</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Spend</p>
                  <p className="text-2xl font-semibold mt-1">{formatCurrency(accountInsights.spend)}</p>
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Link CTR</p>
                  <p className="text-2xl font-semibold mt-1">{formatPercent(accountInsights.link_ctr)}</p>
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Link CPC</p>
                  <p className="text-2xl font-semibold mt-1">{formatCurrency(accountInsights.link_cpc)}</p>
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">ROAS</p>
                  <p className="text-2xl font-semibold mt-1">{accountInsights.roas ? accountInsights.roas.toFixed(2) + 'x' : '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Purchases</p>
                  <p className="text-xl font-semibold mt-1">{accountInsights.purchases || 0}</p>
                  {accountInsights.cost_per_purchase && (
                    <p className="text-xs text-[#A3A3A3] mt-1">@ {formatCurrency(accountInsights.cost_per_purchase)}</p>
                  )}
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Add to Cart</p>
                  <p className="text-xl font-semibold mt-1">{accountInsights.add_to_cart || 0}</p>
                  {accountInsights.cost_per_add_to_cart && (
                    <p className="text-xs text-[#A3A3A3] mt-1">@ {formatCurrency(accountInsights.cost_per_add_to_cart)}</p>
                  )}
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Checkout</p>
                  <p className="text-xl font-semibold mt-1">{accountInsights.initiate_checkout || 0}</p>
                  {accountInsights.cost_per_initiate_checkout && (
                    <p className="text-xs text-[#A3A3A3] mt-1">@ {formatCurrency(accountInsights.cost_per_initiate_checkout)}</p>
                  )}
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">LPV</p>
                  <p className="text-xl font-semibold mt-1">{accountInsights.landing_page_views || 0}</p>
                  {accountInsights.cost_per_landing_page_view && (
                    <p className="text-xs text-[#A3A3A3] mt-1">@ {formatCurrency(accountInsights.cost_per_landing_page_view)}</p>
                  )}
                </div>
                <div className="border border-[#E5E5E5] p-4">
                  <p className="text-xs text-[#A3A3A3]">Traffic Quality</p>
                  <p className="text-xl font-semibold mt-1">{accountInsights.traffic_quality ? (accountInsights.traffic_quality * 100).toFixed(1) + '%' : '-'}</p>
                  <p className="text-xs text-[#A3A3A3] mt-1">LPV / Link Clicks</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* AI vs Manual Comparison */}
        <div>
          <h2 className="text-sm font-medium text-[#737373] mb-3">AI VS MANUAL ADS</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* AI Ads */}
            <div className="border border-[#E5E5E5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium">AI Generated ({comparison.ai.count})</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Total Spend</span>
                  <span className="text-sm font-medium">{formatCurrency(comparison.ai.totalSpend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Purchases</span>
                  <span className="text-sm font-medium">{comparison.ai.totalPurchases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg Link CTR</span>
                  <span className="text-sm font-medium">{formatPercent(comparison.ai.avgCtr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg Link CPC</span>
                  <span className="text-sm font-medium">{formatCurrency(comparison.ai.avgCpc)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg CPP</span>
                  <span className="text-sm font-medium">{formatCurrency(comparison.ai.avgCostPerPurchase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg ROAS</span>
                  <span className="text-sm font-medium">{comparison.ai.avgRoas ? comparison.ai.avgRoas.toFixed(2) + 'x' : '-'}</span>
                </div>
              </div>
            </div>

            {/* Manual Ads */}
            <div className="border border-[#E5E5E5] p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Manual ({comparison.manual.count})</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Total Spend</span>
                  <span className="text-sm font-medium">{formatCurrency(comparison.manual.totalSpend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Purchases</span>
                  <span className="text-sm font-medium">{comparison.manual.totalPurchases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg Link CTR</span>
                  <span className="text-sm font-medium">{formatPercent(comparison.manual.avgCtr)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg Link CPC</span>
                  <span className="text-sm font-medium">{formatCurrency(comparison.manual.avgCpc)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg CPP</span>
                  <span className="text-sm font-medium">{formatCurrency(comparison.manual.avgCostPerPurchase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#737373]">Avg ROAS</span>
                  <span className="text-sm font-medium">{comparison.manual.avgRoas ? comparison.manual.avgRoas.toFixed(2) + 'x' : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison indicators */}
          {comparison.ai.count > 0 && comparison.manual.count > 0 && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                {comparison.ai.avgCtr > comparison.manual.avgCtr ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={comparison.ai.avgCtr > comparison.manual.avgCtr ? 'text-green-600' : 'text-red-600'}>
                  AI CTR {comparison.ai.avgCtr > comparison.manual.avgCtr ? 'higher' : 'lower'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {comparison.ai.avgCpc < comparison.manual.avgCpc ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={comparison.ai.avgCpc < comparison.manual.avgCpc ? 'text-green-600' : 'text-red-600'}>
                  AI CPC {comparison.ai.avgCpc < comparison.manual.avgCpc ? 'lower' : 'higher'}
                </span>
              </div>
              {comparison.ai.avgCostPerPurchase > 0 && comparison.manual.avgCostPerPurchase > 0 && (
                <div className="flex items-center gap-1">
                  {comparison.ai.avgCostPerPurchase < comparison.manual.avgCostPerPurchase ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={comparison.ai.avgCostPerPurchase < comparison.manual.avgCostPerPurchase ? 'text-green-600' : 'text-red-600'}>
                    AI CPP {comparison.ai.avgCostPerPurchase < comparison.manual.avgCostPerPurchase ? 'lower' : 'higher'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ads Performance Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-[#737373]">ADS PERFORMANCE</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A3A3A3]">Sort by:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-')
                  setSortBy(field as typeof sortBy)
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="h-8 px-2 text-xs border border-[#E5E5E5] bg-white"
              >
                <option value="spend-desc">Spend (High to Low)</option>
                <option value="spend-asc">Spend (Low to High)</option>
                <option value="link_ctr-desc">Link CTR (High to Low)</option>
                <option value="link_ctr-asc">Link CTR (Low to High)</option>
                <option value="link_cpc-asc">Link CPC (Low to High)</option>
                <option value="link_cpc-desc">Link CPC (High to Low)</option>
                <option value="cost_per_purchase-asc">CPP (Low to High)</option>
                <option value="cost_per_purchase-desc">CPP (High to Low)</option>
                <option value="roas-desc">ROAS (High to Low)</option>
                <option value="roas-asc">ROAS (Low to High)</option>
              </select>
            </div>
          </div>

          {isLoadingAds ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#A3A3A3]" />
            </div>
          ) : ads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#A3A3A3]">No ads found</p>
            </div>
          ) : (
            <div className="border border-[#E5E5E5] overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                    <th className="text-left text-xs font-medium text-[#737373] p-3">Ad</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-20">Spend</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-16">L-CTR</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-16">L-CPC</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-14">LPV</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-14">ATC</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-14">Purch</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-16">CPP</th>
                    <th className="text-right text-xs font-medium text-[#737373] p-3 w-16">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAds.map((ad) => (
                    <tr key={ad.id} className="border-b border-[#E5E5E5] last:border-0 hover:bg-[#FAFAFA]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {ad.is_ai_generated && (
                            <span title="AI Generated">
                              <Bot className="w-4 h-4 text-[#737373] flex-shrink-0" />
                            </span>
                          )}
                          <span className="text-sm truncate max-w-[250px]">{ad.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-sm">{formatCurrency(ad.insights?.spend)}</td>
                      <td className="p-3 text-right text-sm">{formatPercent(ad.insights?.link_ctr)}</td>
                      <td className="p-3 text-right text-sm">{formatCurrency(ad.insights?.link_cpc)}</td>
                      <td className="p-3 text-right text-sm">{ad.insights?.landing_page_views || '-'}</td>
                      <td className="p-3 text-right text-sm">{ad.insights?.add_to_cart || '-'}</td>
                      <td className="p-3 text-right text-sm">{ad.insights?.purchases || '-'}</td>
                      <td className="p-3 text-right text-sm">{formatCurrency(ad.insights?.cost_per_purchase)}</td>
                      <td className="p-3 text-right text-sm">{ad.insights?.roas ? ad.insights.roas.toFixed(2) + 'x' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
