import { useRef, useEffect } from 'react'
import { Search, Lightbulb, Sparkles, CheckCircle, AlertCircle, Info, Brain, FileSearch } from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import type { WorkLogEntry } from '../App'

interface WorkLogProps {
  entries: WorkLogEntry[]
  isWorking: boolean
  processingCount: number
}

const iconMap = {
  info: Info,
  research: FileSearch,
  pattern: Search,
  hypothesis: Lightbulb,
  generation: Sparkles,
  review: Brain,
  ready: CheckCircle,
  error: AlertCircle,
}

const colorMap = {
  info: 'text-muted-foreground',
  research: 'text-blue-500',
  pattern: 'text-purple-500',
  hypothesis: 'text-yellow-500',
  generation: 'text-green-500',
  review: 'text-orange-500',
  ready: 'text-green-600',
  error: 'text-red-500',
}

export function WorkLog({ entries, isWorking, processingCount }: WorkLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Work Log</h2>
        <p className="text-sm text-muted-foreground">
          {isWorking ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              AI is working... {processingCount > 0 && `(${processingCount} in progress)`}
            </span>
          ) : (
            'Click "Start Working" to begin'
          )}
        </p>
      </div>

      {/* Log Entries */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No activity yet</p>
            <p className="text-sm mt-2">
              Upload data sources, then click "Start Working"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const Icon = iconMap[entry.type]
              const color = colorMap[entry.type]

              return (
                <div
                  key={entry.id}
                  className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{entry.message}</p>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {entry.details}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {isWorking && (
              <div className="flex gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30">
                <div className="mt-0.5 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Processing...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
