import { useState, useMemo } from 'react'
import { Plus, Sparkles, X, Search } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import { Button } from './ui/button'
import type { AdConcept } from '../App'

interface ConceptListProps {
  concepts: AdConcept[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
  isWorking?: boolean
  onCreateConcept?: (ideas?: string) => void
}

const statusLabels: Record<string, string> = {
  researching: 'researching',
  generating: 'generating',
  reviewing: 'reviewing',
  ready: 'ready',
  approved: 'approved',
  rejected: 'rejected',
}

const statusColors: Record<string, string> = {
  researching: 'text-[#A3A3A3]',
  generating: 'text-[#A3A3A3]',
  reviewing: 'text-[#A3A3A3]',
  ready: 'text-black',
  approved: 'text-[#737373]',
  rejected: 'text-[#A3A3A3]',
}

export function ConceptList({ concepts, selectedId, onSelect, isLoading = false, isWorking = false, onCreateConcept }: ConceptListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [ideas, setIdeas] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const handleCreate = () => {
    if (onCreateConcept) {
      onCreateConcept(ideas.trim() || undefined)
      setIdeas('')
      setShowCreateForm(false)
    }
  }

  const filteredConcepts = useMemo(() => {
    return concepts.filter(concept => {
      // Status filter
      if (statusFilter && concept.status !== statusFilter) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesBatch = concept.batch_number.toLowerCase().includes(query)
        const matchesText = concept.primary_texts?.some(t => t.toLowerCase().includes(query))
        const matchesHeadline = concept.headlines?.some(h => h.toLowerCase().includes(query))
        if (!matchesBatch && !matchesText && !matchesHeadline) return false
      }

      return true
    })
  }, [concepts, searchQuery, statusFilter])

  return (
    <div className="h-full flex flex-col">
      {/* Create Concept Section */}
      <div className="p-3 border-b border-[#E5E5E5] flex-shrink-0">
        {!showCreateForm ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2"
            onClick={() => setShowCreateForm(true)}
            disabled={isWorking}
          >
            <Plus className="w-4 h-4" />
            Create Concept
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#737373]">New Concept</span>
              <button
                onClick={() => { setShowCreateForm(false); setIdeas('') }}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={ideas}
              onChange={(e) => setIdeas(e.target.value)}
              placeholder="Optional: Add ideas, angles, or guidance..."
              className="w-full h-20 p-2 text-xs border border-[#E5E5E5] rounded resize-none focus:outline-none focus:border-black"
            />
            <Button
              size="sm"
              className="w-full justify-center gap-2"
              onClick={handleCreate}
              disabled={isWorking}
            >
              <Sparkles className="w-3 h-3" />
              {ideas.trim() ? 'Generate with Ideas' : 'Generate'}
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      {concepts.length > 3 && (
        <div className="p-2 border-b border-[#E5E5E5] flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1 text-xs border border-[#E5E5E5] focus:outline-none focus:border-black"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-[#E5E5E5] bg-white focus:outline-none focus:border-black"
          >
            <option value="">All statuses</option>
            <option value="ready">Ready</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="generating">Generating</option>
          </select>
        </div>
      )}

      {/* Concepts List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3 border-b border-[#E5E5E5] space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </>
        ) : filteredConcepts.length === 0 ? (
          <div className="flex items-center justify-center p-4 h-32">
            <p className="text-xs text-[#A3A3A3] text-center">
              {concepts.length === 0 ? 'No concepts yet.' : 'No matches found.'}
            </p>
          </div>
        ) : (
          filteredConcepts.map((concept) => {
            const isSelected = concept.id === selectedId
            const isReady = concept.status === 'ready'

            return (
              <button
                key={concept.id}
                onClick={() => onSelect(concept.id)}
                className={`
                  w-full text-left px-4 py-3 border-b border-[#E5E5E5] transition-colors
                  ${isSelected ? 'border-l-2 border-l-black bg-[#FAFAFA]' : 'border-l-2 border-l-transparent hover:bg-[#FAFAFA]'}
                `}
              >
                <div className={`text-sm font-medium ${isSelected || isReady ? 'text-black' : 'text-[#737373]'}`}>
                  {concept.batch_number}
                </div>
                <div className={`text-xs mt-0.5 ${statusColors[concept.status]}`}>
                  {statusLabels[concept.status]}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
