import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Clock, Cpu, Brain, AlertCircle } from 'lucide-react'
import { API_BASE } from '../config'
import { authFetch } from '../auth'

interface LLMLog {
  id: string
  concept_id: string | null
  call_name: string
  model_id: string
  thinking_enabled: boolean
  thinking_budget: number | null
  system_prompt: string | null
  user_prompt: string
  response_text: string | null
  thinking_text: string | null
  input_tokens: number | null
  output_tokens: number | null
  thinking_tokens: number | null
  latency_ms: number | null
  error: string | null
  created_at: string
}

interface LLMLogsViewerProps {
  conceptId: string
}

export function LLMLogsViewer({ conceptId }: LLMLogsViewerProps) {
  const [logs, setLogs] = useState<LLMLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [conceptId])

  const fetchLogs = async () => {
    try {
      const res = await authFetch(`${API_BASE}/settings/llm-logs/concept/${conceptId}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch LLM logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLog = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId)
    setExpandedSection(null)
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const formatLatency = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTokens = (tokens: number | null) => {
    if (!tokens) return '-'
    if (tokens < 1000) return tokens.toString()
    return `${(tokens / 1000).toFixed(1)}K`
  }

  const getCallColor = (callName: string) => {
    switch (callName) {
      case 'pattern_analysis':
        return 'text-blue-600 bg-blue-50'
      case 'hypothesis_generation':
        return 'text-purple-600 bg-purple-50'
      case 'copywriter':
        return 'text-green-600 bg-green-50'
      case 'review_agent':
        return 'text-orange-600 bg-orange-50'
      case 'principle_check':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-[#A3A3A3] py-4">Loading LLM logs...</div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-[#A3A3A3] py-4">No LLM logs found for this concept.</div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-[#737373] uppercase tracking-wide mb-3">
        LLM Call Logs ({logs.length} calls)
      </div>

      {logs.map((log, index) => (
        <div key={log.id} className="border border-[#E5E5E5]">
          {/* Log Header */}
          <button
            onClick={() => toggleLog(log.id)}
            className="w-full flex items-center justify-between p-3 hover:bg-[#FAFAFA] transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedLog === log.id ? (
                <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#A3A3A3]" />
              )}
              <span className="text-xs text-[#A3A3A3]">#{index + 1}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCallColor(log.call_name)}`}>
                {log.call_name.replace(/_/g, ' ')}
              </span>
              {log.thinking_enabled && (
                <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  <Brain className="w-3 h-3" />
                  thinking
                </span>
              )}
              {log.error && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="w-3 h-3" />
                  error
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-[#A3A3A3]">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {log.model_id.includes('_thinking') ? log.model_id.replace('_thinking', '') : log.model_id}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLatency(log.latency_ms)}
              </span>
              <span className="font-mono">
                {formatTokens(log.input_tokens)} in / {formatTokens(log.output_tokens)} out
              </span>
            </div>
          </button>

          {/* Expanded Log Details */}
          {expandedLog === log.id && (
            <div className="border-t border-[#E5E5E5] p-4 space-y-4 bg-[#FAFAFA]">
              {/* Metrics */}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-[#737373] block">Input Tokens</span>
                  <span className="font-mono">{log.input_tokens?.toLocaleString() || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] block">Output Tokens</span>
                  <span className="font-mono">{log.output_tokens?.toLocaleString() || '-'}</span>
                </div>
                {log.thinking_enabled && (
                  <div>
                    <span className="text-xs text-[#737373] block">Thinking Tokens</span>
                    <span className="font-mono">{log.thinking_tokens?.toLocaleString() || '-'}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-[#737373] block">Latency</span>
                  <span className="font-mono">{formatLatency(log.latency_ms)}</span>
                </div>
              </div>

              {/* Error */}
              {log.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <span className="text-xs font-medium text-red-700 block mb-1">Error</span>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">{log.error}</pre>
                </div>
              )}

              {/* Collapsible Sections */}
              <div className="space-y-2">
                {/* System Prompt */}
                {log.system_prompt && (
                  <div className="border border-[#E5E5E5] bg-white">
                    <button
                      onClick={() => toggleSection('system')}
                      className="w-full flex items-center justify-between p-2 hover:bg-[#FAFAFA]"
                    >
                      <span className="text-xs font-medium">System Prompt</span>
                      <span className="text-xs text-[#A3A3A3]">
                        {log.system_prompt.length.toLocaleString()} chars
                      </span>
                    </button>
                    {expandedSection === 'system' && (
                      <div className="p-3 border-t border-[#E5E5E5] max-h-96 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-[#525252]">
                          {log.system_prompt}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* User Prompt */}
                <div className="border border-[#E5E5E5] bg-white">
                  <button
                    onClick={() => toggleSection('user')}
                    className="w-full flex items-center justify-between p-2 hover:bg-[#FAFAFA]"
                  >
                    <span className="text-xs font-medium">User Prompt</span>
                    <span className="text-xs text-[#A3A3A3]">
                      {log.user_prompt.length.toLocaleString()} chars
                    </span>
                  </button>
                  {expandedSection === 'user' && (
                    <div className="p-3 border-t border-[#E5E5E5] max-h-96 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-[#525252]">
                        {log.user_prompt}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Thinking Text */}
                {log.thinking_text && (
                  <div className="border border-purple-200 bg-purple-50">
                    <button
                      onClick={() => toggleSection('thinking')}
                      className="w-full flex items-center justify-between p-2 hover:bg-purple-100"
                    >
                      <span className="text-xs font-medium text-purple-700">Thinking</span>
                      <span className="text-xs text-purple-600">
                        {log.thinking_text.length.toLocaleString()} chars
                      </span>
                    </button>
                    {expandedSection === 'thinking' && (
                      <div className="p-3 border-t border-purple-200 max-h-96 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-purple-800">
                          {log.thinking_text}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Response Text */}
                {log.response_text && (
                  <div className="border border-[#E5E5E5] bg-white">
                    <button
                      onClick={() => toggleSection('response')}
                      className="w-full flex items-center justify-between p-2 hover:bg-[#FAFAFA]"
                    >
                      <span className="text-xs font-medium">Response</span>
                      <span className="text-xs text-[#A3A3A3]">
                        {log.response_text.length.toLocaleString()} chars
                      </span>
                    </button>
                    {expandedSection === 'response' && (
                      <div className="p-3 border-t border-[#E5E5E5] max-h-96 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-[#525252]">
                          {log.response_text}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
