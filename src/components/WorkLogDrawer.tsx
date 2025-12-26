import { ChevronUp, ChevronDown } from 'lucide-react'
import type { WorkLogEntry } from '../App'

interface WorkLogDrawerProps {
  entries: WorkLogEntry[]
  expanded: boolean
  onToggle: () => void
  latestMessage?: string
}

export function WorkLogDrawer({ entries, expanded, onToggle, latestMessage }: WorkLogDrawerProps) {
  return (
    <div
      className={`
        border-t border-[#E5E5E5] bg-white/80 backdrop-blur-xl flex-shrink-0 transition-all duration-200
        ${expanded ? 'h-[40vh]' : 'h-10'}
      `}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full h-10 px-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
          )}
          <span className="text-sm font-medium">Work Log</span>
        </div>
        {!expanded && latestMessage && (
          <span className="text-sm text-[#A3A3A3] truncate max-w-[50%]">
            {latestMessage}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="h-[calc(40vh-40px)] overflow-y-auto px-4 pb-4">
          <div className="space-y-1 font-mono text-xs">
            {entries.length === 0 ? (
              <p className="text-[#A3A3A3] py-4">No log entries yet.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="flex gap-3 py-1">
                  <span className="text-[#A3A3A3] flex-shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`flex-shrink-0 w-16 ${entry.type === 'error' ? 'text-black font-medium' : 'text-[#737373]'}`}>
                    [{entry.type}]
                  </span>
                  <span className={entry.type === 'error' ? 'text-black' : 'text-[#737373]'}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
