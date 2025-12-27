// Shared analytics cache utility
// Used by Analytics component to store data, Learnings to read it

export const ANALYTICS_CACHE_KEY = 'analytics_cache_v2'
export const ANALYTICS_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export type DatePreset = 'yesterday' | 'last_7d' | 'last_30d' | 'this_month'

export interface AdInsights {
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
}

export interface CachedAd {
  id: string
  name: string
  is_ai_generated: boolean
  insights: AdInsights
  thumbnail_url?: string
  primary_text?: string
}

export interface CachedDateData {
  insights: AdInsights | null
  ads: CachedAd[]
  lastRefreshed: number
}

export interface AnalyticsCacheData {
  data: Record<DatePreset, CachedDateData>
  timestamp: number
}

// Get all cached ads across all date presets (deduplicated)
export function getCachedAds(): CachedAd[] {
  try {
    const saved = localStorage.getItem(ANALYTICS_CACHE_KEY)
    if (!saved) return []

    const parsed: AnalyticsCacheData = JSON.parse(saved)
    if (Date.now() - parsed.timestamp > ANALYTICS_CACHE_TTL) return []

    // Get ads from the longest date range available (prefer last_30d)
    const preferredOrder: DatePreset[] = ['last_30d', 'this_month', 'last_7d', 'yesterday']

    for (const preset of preferredOrder) {
      const data = parsed.data[preset]
      if (data?.ads?.length > 0) {
        return data.ads
      }
    }

    return []
  } catch (e) {
    console.error('Failed to read analytics cache:', e)
    return []
  }
}

// Check if cache has data
export function hasCachedAnalytics(): boolean {
  return getCachedAds().length > 0
}

// Get cache timestamp
export function getCacheTimestamp(): number | null {
  try {
    const saved = localStorage.getItem(ANALYTICS_CACHE_KEY)
    if (!saved) return null

    const parsed: AnalyticsCacheData = JSON.parse(saved)
    return parsed.timestamp
  } catch {
    return null
  }
}
