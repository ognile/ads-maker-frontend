import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Bot, User, Settings, X, GripVertical } from 'lucide-react'
import { Button } from './ui/button'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { API_BASE } from '../config'
const CACHE_KEY = 'analytics_cache_v2'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const COLUMN_PREFS_KEY = 'analytics_column_prefs'
const OVERVIEW_PREFS_KEY = 'analytics_overview_prefs'

type DatePreset = 'yesterday' | 'last_7d' | 'last_30d' | 'this_month'

interface ColumnConfig {
  id: string
  label: string
  shortLabel: string
  visible: boolean
  formatter: 'currency' | 'percent' | 'number' | 'roas'
}

interface OverviewMetricConfig {
  id: string
  label: string
  visible: boolean
  size: 'large' | 'small'
  formatter: 'currency' | 'percent' | 'number' | 'roas'
  subMetric?: string // e.g., cost_per_purchase for purchases
}

const DEFAULT_OVERVIEW_METRICS: OverviewMetricConfig[] = [
  { id: 'spend', label: 'Spend', visible: true, size: 'large', formatter: 'currency' },
  { id: 'link_ctr', label: 'Link CTR', visible: true, size: 'large', formatter: 'percent' },
  { id: 'link_cpc', label: 'Link CPC', visible: true, size: 'large', formatter: 'currency' },
  { id: 'roas', label: 'ROAS', visible: true, size: 'large', formatter: 'roas' },
  { id: 'purchases', label: 'Purchases', visible: true, size: 'small', formatter: 'number', subMetric: 'cost_per_purchase' },
  { id: 'add_to_cart', label: 'Add to Cart', visible: true, size: 'small', formatter: 'number', subMetric: 'cost_per_add_to_cart' },
  { id: 'initiate_checkout', label: 'Checkout', visible: true, size: 'small', formatter: 'number', subMetric: 'cost_per_initiate_checkout' },
  { id: 'landing_page_views', label: 'LPV', visible: true, size: 'small', formatter: 'number', subMetric: 'cost_per_landing_page_view' },
  { id: 'traffic_quality', label: 'Traffic Quality', visible: true, size: 'small', formatter: 'percent' },
  { id: 'impressions', label: 'Impressions', visible: false, size: 'small', formatter: 'number' },
  { id: 'reach', label: 'Reach', visible: false, size: 'small', formatter: 'number' },
  { id: 'link_clicks', label: 'Link Clicks', visible: false, size: 'small', formatter: 'number' },
]

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'spend', label: 'Spend', shortLabel: 'Spend', visible: true, formatter: 'currency' },
  { id: 'link_ctr', label: 'Link CTR', shortLabel: 'L-CTR', visible: true, formatter: 'percent' },
  { id: 'link_cpc', label: 'Link CPC', shortLabel: 'L-CPC', visible: true, formatter: 'currency' },
  { id: 'landing_page_views', label: 'Landing Page Views', shortLabel: 'LPV', visible: true, formatter: 'number' },
  { id: 'add_to_cart', label: 'Add to Cart', shortLabel: 'ATC', visible: true, formatter: 'number' },
  { id: 'purchases', label: 'Purchases', shortLabel: 'Purch', visible: true, formatter: 'number' },
  { id: 'cost_per_purchase', label: 'Cost per Purchase', shortLabel: 'CPP', visible: true, formatter: 'currency' },
  { id: 'roas', label: 'ROAS', shortLabel: 'ROAS', visible: true, formatter: 'roas' },
  { id: 'initiate_checkout', label: 'Initiate Checkout', shortLabel: 'IC', visible: false, formatter: 'number' },
  { id: 'cost_per_add_to_cart', label: 'Cost per ATC', shortLabel: 'CATC', visible: false, formatter: 'currency' },
  { id: 'cost_per_landing_page_view', label: 'Cost per LPV', shortLabel: 'CLPV', visible: false, formatter: 'currency' },
  { id: 'cost_per_initiate_checkout', label: 'Cost per IC', shortLabel: 'CIC', visible: false, formatter: 'currency' },
  { id: 'traffic_quality', label: 'Traffic Quality', shortLabel: 'TQ', visible: false, formatter: 'percent' },
]

interface Insights {
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
  thumbnail_url?: string
  primary_text?: string
}

interface CacheData {
  data: Record<DatePreset, {
    insights: Insights | null
    ads: Ad[]
    lastRefreshed: number
  }>
  timestamp: number
}

// Sortable column item component
function SortableColumnItem({ column, onToggle }: { column: ColumnConfig; onToggle: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border border-[#E5E5E5] bg-white ${isDragging ? 'shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[#A3A3A3] hover:text-black"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <label className="flex items-center gap-2 flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={column.visible}
          onChange={() => onToggle(column.id)}
          className="w-4 h-4 accent-black"
        />
        <span className="text-sm">{column.label}</span>
        <span className="text-xs text-[#A3A3A3]">({column.shortLabel})</span>
      </label>
    </div>
  )
}

// Load cache from localStorage
const loadCacheFromStorage = (): Record<DatePreset, { insights: Insights | null; ads: Ad[]; lastRefreshed: number }> => {
  try {
    const saved = localStorage.getItem(CACHE_KEY)
    if (saved) {
      const parsed: CacheData = JSON.parse(saved)
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

// Load overview preferences from localStorage
const loadOverviewPrefs = (): OverviewMetricConfig[] => {
  try {
    const saved = localStorage.getItem(OVERVIEW_PREFS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to handle new metrics
      const merged = DEFAULT_OVERVIEW_METRICS.map(def => {
        const savedItem = parsed.find((p: OverviewMetricConfig) => p.id === def.id)
        return savedItem ? { ...def, visible: savedItem.visible, size: savedItem.size || def.size } : def
      })
      // Reorder based on saved order
      const orderedIds = parsed.map((p: OverviewMetricConfig) => p.id)
      merged.sort((a, b) => {
        const aIdx = orderedIds.indexOf(a.id)
        const bIdx = orderedIds.indexOf(b.id)
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
      return merged
    }
  } catch (e) {
    console.error('Failed to load overview prefs:', e)
  }
  return DEFAULT_OVERVIEW_METRICS
}

// Load column preferences from localStorage
const loadColumnPrefs = (): ColumnConfig[] => {
  try {
    const saved = localStorage.getItem(COLUMN_PREFS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to handle new columns
      const merged = DEFAULT_COLUMNS.map(def => {
        const savedItem = parsed.find((p: ColumnConfig) => p.id === def.id)
        return savedItem ? { ...def, visible: savedItem.visible } : def
      })
      // Reorder based on saved order
      const orderedIds = parsed.map((p: ColumnConfig) => p.id)
      merged.sort((a, b) => {
        const aIdx = orderedIds.indexOf(a.id)
        const bIdx = orderedIds.indexOf(b.id)
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      })
      return merged
    }
  } catch (e) {
    console.error('Failed to load column prefs:', e)
  }
  return DEFAULT_COLUMNS
}

export function Analytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>('last_7d')
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingAds, setIsLoadingAds] = useState(false)
  const [sortBy, setSortBy] = useState<string>('spend')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [columns, setColumns] = useState<ColumnConfig[]>(() => loadColumnPrefs())
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetricConfig[]>(() => loadOverviewPrefs())
  const [settingsTab, setSettingsTab] = useState<'columns' | 'overview'>('columns')

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  // Save column preferences whenever they change
  useEffect(() => {
    localStorage.setItem(COLUMN_PREFS_KEY, JSON.stringify(columns))
  }, [columns])

  // Save overview preferences whenever they change
  useEffect(() => {
    localStorage.setItem(OVERVIEW_PREFS_KEY, JSON.stringify(overviewMetrics))
  }, [overviewMetrics])

  useEffect(() => {
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

  // Column drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Toggle column visibility
  const toggleColumn = (id: string) => {
    setColumns(cols => cols.map(c =>
      c.id === id ? { ...c, visible: !c.visible } : c
    ))
  }

  // Toggle overview metric visibility
  const toggleOverviewMetric = (id: string) => {
    setOverviewMetrics(metrics => metrics.map(m =>
      m.id === id ? { ...m, visible: !m.visible } : m
    ))
  }

  // Visible columns and overview metrics
  const visibleColumns = columns.filter(c => c.visible)
  const visibleOverviewLarge = overviewMetrics.filter(m => m.visible && m.size === 'large')
  const visibleOverviewSmall = overviewMetrics.filter(m => m.visible && m.size === 'small')

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
        const val = (ad.insights as any)?.[sortBy]
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

  const formatValue = (value: any, formatter: string) => {
    if (value === undefined || value === null) return '-'
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '-'

    switch (formatter) {
      case 'currency':
        return `$${num.toFixed(2)}`
      case 'percent':
        return `${num.toFixed(2)}%`
      case 'roas':
        return `${num.toFixed(2)}x`
      case 'number':
      default:
        return num.toString()
    }
  }

  const datePresetLabels: Record<DatePreset, string> = {
    yesterday: 'Yesterday',
    last_7d: 'Last 7 Days',
    last_30d: 'Last 30 Days',
    this_month: 'This Month',
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'yesterday'
    return `${diffDays} days ago`
  }

  const isDataStale = lastRefreshed ? (Date.now() - lastRefreshed.getTime()) > CACHE_TTL : true

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
          {lastRefreshed ? (
            <div className={`text-xs flex items-center gap-1 ${isDataStale ? 'text-orange-600' : 'text-[#A3A3A3]'}`}>
              <span>Last updated:</span>
              <span className={`font-medium ${isDataStale ? 'text-orange-700' : 'text-[#525252]'}`}>
                {formatTimeAgo(lastRefreshed)}
              </span>
              {isDataStale && <span className="text-orange-600">(stale)</span>}
            </div>
          ) : (
            <span className="text-xs text-[#A3A3A3]">No data cached</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant={isDataStale ? "default" : "outline"}
            size="sm"
            onClick={fetchData}
            disabled={isLoadingInsights || isLoadingAds}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingInsights || isLoadingAds ? 'animate-spin' : ''}`} />
            {isLoadingInsights || isLoadingAds ? 'Loading...' : 'Refresh'}
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
              {/* Large metrics row */}
              {visibleOverviewLarge.length > 0 && (
                <div className={`grid gap-4 mb-4`} style={{ gridTemplateColumns: `repeat(${Math.min(visibleOverviewLarge.length, 4)}, minmax(0, 1fr))` }}>
                  {visibleOverviewLarge.map(metric => {
                    const value = accountInsights[metric.id as keyof Insights]
                    return (
                      <div key={metric.id} className="border border-[#E5E5E5] p-4">
                        <p className="text-xs text-[#A3A3A3]">{metric.label}</p>
                        <p className="text-2xl font-semibold mt-1">{formatValue(value, metric.formatter)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Small metrics row */}
              {visibleOverviewSmall.length > 0 && (
                <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(visibleOverviewSmall.length, 5)}, minmax(0, 1fr))` }}>
                  {visibleOverviewSmall.map(metric => {
                    const value = accountInsights[metric.id as keyof Insights]
                    const subValue = metric.subMetric ? accountInsights[metric.subMetric as keyof Insights] : null
                    const isTrafficQuality = metric.id === 'traffic_quality'
                    return (
                      <div key={metric.id} className="border border-[#E5E5E5] p-4">
                        <p className="text-xs text-[#A3A3A3]">{metric.label}</p>
                        <p className="text-xl font-semibold mt-1">
                          {isTrafficQuality && value
                            ? ((value as number) * 100).toFixed(1) + '%'
                            : formatValue(value, metric.formatter)}
                        </p>
                        {subValue && (
                          <p className="text-xs text-[#A3A3A3] mt-1">@ {formatCurrency(subValue as number)}</p>
                        )}
                        {isTrafficQuality && (
                          <p className="text-xs text-[#A3A3A3] mt-1">LPV / Link Clicks</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
                  setSortBy(field)
                  setSortOrder(order as 'asc' | 'desc')
                }}
                className="h-8 px-2 text-xs border border-[#E5E5E5] bg-white"
              >
                {visibleColumns.map(col => (
                  <optgroup key={col.id} label={col.label}>
                    <option value={`${col.id}-desc`}>{col.label} (High to Low)</option>
                    <option value={`${col.id}-asc`}>{col.label} (Low to High)</option>
                  </optgroup>
                ))}
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
                    {visibleColumns.map(col => (
                      <th key={col.id} className="text-right text-xs font-medium text-[#737373] p-3 w-20">
                        {col.shortLabel}
                      </th>
                    ))}
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
                      {visibleColumns.map(col => (
                        <td key={col.id} className="p-3 text-right text-sm">
                          {formatValue((ad.insights as any)?.[col.id], col.formatter)}
                        </td>
                      ))}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 className="text-lg font-medium">Analytics Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-[#A3A3A3] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E5E5E5]">
              <button
                onClick={() => setSettingsTab('overview')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  settingsTab === 'overview'
                    ? 'border-b-2 border-black text-black'
                    : 'text-[#737373] hover:text-black'
                }`}
              >
                Overview Cards
              </button>
              <button
                onClick={() => setSettingsTab('columns')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  settingsTab === 'columns'
                    ? 'border-b-2 border-black text-black'
                    : 'text-[#737373] hover:text-black'
                }`}
              >
                Table Columns
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {settingsTab === 'columns' ? (
                <>
                  <p className="text-sm text-[#737373] mb-4">
                    Drag to reorder. Check/uncheck to show/hide columns.
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={columns.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {columns.map(col => (
                          <SortableColumnItem
                            key={col.id}
                            column={col}
                            onToggle={toggleColumn}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#737373] mb-4">
                    Choose which metrics to display in the account overview section.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-medium text-[#A3A3A3] mb-2">LARGE CARDS (Top Row)</h3>
                      <div className="space-y-2">
                        {overviewMetrics.filter(m => m.size === 'large').map(metric => (
                          <label key={metric.id} className="flex items-center gap-3 p-2 border border-[#E5E5E5] cursor-pointer hover:bg-[#FAFAFA]">
                            <input
                              type="checkbox"
                              checked={metric.visible}
                              onChange={() => toggleOverviewMetric(metric.id)}
                              className="w-4 h-4 accent-black"
                            />
                            <span className="text-sm">{metric.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-[#A3A3A3] mb-2">SMALL CARDS (Bottom Row)</h3>
                      <div className="space-y-2">
                        {overviewMetrics.filter(m => m.size === 'small').map(metric => (
                          <label key={metric.id} className="flex items-center gap-3 p-2 border border-[#E5E5E5] cursor-pointer hover:bg-[#FAFAFA]">
                            <input
                              type="checkbox"
                              checked={metric.visible}
                              onChange={() => toggleOverviewMetric(metric.id)}
                              className="w-4 h-4 accent-black"
                            />
                            <span className="text-sm">{metric.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-[#E5E5E5] flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (settingsTab === 'columns') {
                    setColumns(DEFAULT_COLUMNS)
                  } else {
                    setOverviewMetrics(DEFAULT_OVERVIEW_METRICS)
                  }
                }}
              >
                Reset to Default
              </Button>
              <Button
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
