import { useState, useEffect } from 'react'
import { DollarSign, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface UsageSummary {
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_images: number
  count: number
}

interface ModelUsage {
  cost: number
  input_tokens: number
  output_tokens: number
  images: number
  count: number
}

interface TaskUsage {
  cost: number
  input_tokens: number
  output_tokens: number
  images: number
  count: number
}

interface ModelPricing {
  input: number
  output: number
  image?: number
  provider: string
}

const TASK_LABELS: Record<string, string> = {
  copywriter: 'Ad Copy Generation',
  copywriter_review: 'Copy Review',
  orchestrator: 'Chat Orchestrator',
  image_generator: 'Image Generation',
  visual_analyzer_transcribe: 'Image Transcription',
  visual_analyzer_analyze: 'Image Analysis',
  visual_analyzer_video_transcript: 'Video Transcript',
  visual_analyzer_video_visual: 'Video Visual Analysis',
  visual_analyzer_video_analyze: 'Video Analysis',
  visual_analyzer_comment_sentiment: 'Comment Sentiment',
  visual_analyzer_compare_creatives: 'Creative Comparison',
}

const MODEL_LABELS: Record<string, string> = {
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
  'claude-opus-4-5-20251124': 'Claude Opus 4.5',
  'claude-haiku-4-5-20251015': 'Claude Haiku 4.5',
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3-pro-preview': 'Gemini 3 Pro',
  'gemini-3-pro-image-preview': 'Gemini 3 Pro Image',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

export function UsageTracking() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [byModel, setByModel] = useState<Record<string, ModelUsage>>({})
  const [byTask, setByTask] = useState<Record<string, TaskUsage>>({})
  const [pricing, setPricing] = useState<Record<string, ModelPricing>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [timeRange, setTimeRange] = useState<number | null>(null)

  const fetchUsage = async () => {
    setIsLoading(true)
    try {
      const params = timeRange ? `?days=${timeRange}` : ''
      const [summaryRes, modelRes, taskRes, pricingRes] = await Promise.all([
        authFetch(`${API_BASE}/settings/usage/summary${params}`),
        authFetch(`${API_BASE}/settings/usage/by-model${params}`),
        authFetch(`${API_BASE}/settings/usage/by-task${params}`),
        authFetch(`${API_BASE}/settings/usage/pricing`),
      ])

      if (summaryRes.ok) {
        setSummary(await summaryRes.json())
      }
      if (modelRes.ok) {
        const data = await modelRes.json()
        setByModel(data.by_model || {})
      }
      if (taskRes.ok) {
        const data = await taskRes.json()
        setByTask(data.by_task || {})
      }
      if (pricingRes.ok) {
        const data = await pricingRes.json()
        setPricing(data.pricing || {})
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [timeRange])

  const sortedModels = Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost)
  const sortedTasks = Object.entries(byTask).sort((a, b) => b[1].cost - a[1].cost)

  return (
    <div className="border border-[#E5E5E5] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#737373]" />
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
            API Usage & Costs
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange ?? ''}
            onChange={(e) => setTimeRange(e.target.value ? parseInt(e.target.value) : null)}
            className="text-xs border border-[#E5E5E5] px-2 py-1 bg-white"
          >
            <option value="">All time</option>
            <option value="1">Last 24h</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <button
            onClick={fetchUsage}
            disabled={isLoading}
            className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !summary ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
        </div>
      ) : summary ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#FAFAFA] p-3 rounded">
              <div className="text-xs text-[#737373]">Total Cost</div>
              <div className="text-lg font-semibold mt-1">{formatCost(summary.total_cost)}</div>
            </div>
            <div className="bg-[#FAFAFA] p-3 rounded">
              <div className="text-xs text-[#737373]">API Calls</div>
              <div className="text-lg font-semibold mt-1">{summary.count.toLocaleString()}</div>
            </div>
            <div className="bg-[#FAFAFA] p-3 rounded">
              <div className="text-xs text-[#737373]">Tokens Used</div>
              <div className="text-lg font-semibold mt-1">
                {formatTokens(summary.total_input_tokens + summary.total_output_tokens)}
              </div>
            </div>
            <div className="bg-[#FAFAFA] p-3 rounded">
              <div className="text-xs text-[#737373]">Images Generated</div>
              <div className="text-lg font-semibold mt-1">{summary.total_images}</div>
            </div>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-[#737373] hover:text-black"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {isExpanded ? 'Hide details' : 'Show breakdown by model & task'}
          </button>

          {isExpanded && (
            <div className="space-y-4 pt-2">
              {/* By Model */}
              {sortedModels.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#737373] mb-2">By Model</h4>
                  <div className="space-y-2">
                    {sortedModels.map(([model, usage]) => (
                      <div key={model} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#737373]">{MODEL_LABELS[model] || model}</span>
                          <span className="text-xs text-[#A3A3A3]">({usage.count} calls)</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-[#A3A3A3]">
                            {formatTokens(usage.input_tokens)} in / {formatTokens(usage.output_tokens)} out
                          </span>
                          <span className="font-medium">{formatCost(usage.cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Task */}
              {sortedTasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#737373] mb-2">By Task</h4>
                  <div className="space-y-2">
                    {sortedTasks.map(([task, usage]) => (
                      <div key={task} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#737373]">{TASK_LABELS[task] || task}</span>
                          <span className="text-xs text-[#A3A3A3]">({usage.count} calls)</span>
                        </div>
                        <span className="font-medium">{formatCost(usage.cost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Reference */}
              {Object.keys(pricing).length > 0 && (
                <div className="pt-2 border-t border-[#E5E5E5]">
                  <h4 className="text-xs font-medium text-[#737373] mb-2">Pricing Reference (per 1M tokens)</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#A3A3A3]">
                    {Object.entries(pricing).map(([model, prices]) => (
                      <div key={model}>
                        <span className="text-[#737373]">{MODEL_LABELS[model] || model}:</span>{' '}
                        ${prices.input}/in, ${prices.output}/out
                        {prices.image && ` + $${prices.image}/img`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-[#A3A3A3]">
          No usage data yet. Costs will be tracked as you use the app.
        </div>
      )}
    </div>
  )
}
