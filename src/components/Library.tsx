import { useState, useMemo } from 'react'
import { Search, Grid, List, Download, Star, X, Check } from 'lucide-react'
import { Button } from './ui/button'
import type { AdConcept } from '../App'

interface LibraryProps {
  concepts: AdConcept[]
  onSelectConcept: (id: string) => void
  onSetRating: (id: string, rating: number) => void
  onDownload: (ids: string[]) => void
}

type ViewMode = 'grid' | 'list'
type SortBy = 'created_at' | 'rating' | 'batch_number'
type SortOrder = 'asc' | 'desc'

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'ready', label: 'Ready' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'researching', label: 'Researching' },
  { value: 'generating', label: 'Generating' },
  { value: 'reviewing', label: 'Reviewing' },
]

const ratingOptions = [
  { value: 0, label: 'Any Rating' },
  { value: 1, label: '1+ Stars' },
  { value: 2, label: '2+ Stars' },
  { value: 3, label: '3+ Stars' },
  { value: 4, label: '4+ Stars' },
  { value: 5, label: '5 Stars' },
]

const statusColors: Record<string, string> = {
  researching: 'bg-[#F5F5F5] text-[#737373]',
  generating: 'bg-[#F5F5F5] text-[#737373]',
  reviewing: 'bg-[#F5F5F5] text-[#737373]',
  ready: 'bg-black text-white',
  approved: 'bg-[#E5E5E5] text-black',
  rejected: 'bg-[#FAFAFA] text-[#A3A3A3]',
}

export function Library({ concepts, onSelectConcept, onSetRating, onDownload }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [minRating, setMinRating] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filter and sort concepts
  const filteredConcepts = useMemo(() => {
    let result = [...concepts]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.batch_number.toLowerCase().includes(query) ||
        c.primary_texts?.some(t => t.toLowerCase().includes(query)) ||
        c.headlines?.some(h => h.toLowerCase().includes(query)) ||
        (c.hypothesis as any)?.hypothesis?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // Rating filter
    if (minRating > 0) {
      result = result.filter(c => (c.rating || 0) >= minRating)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === 'rating') {
        comparison = (a.rating || 0) - (b.rating || 0)
      } else if (sortBy === 'batch_number') {
        comparison = a.batch_number.localeCompare(b.batch_number)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [concepts, searchQuery, statusFilter, minRating, sortBy, sortOrder])

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredConcepts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredConcepts.map(c => c.id)))
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setMinRating(0)
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || minRating > 0

  const handleDownloadSelected = () => {
    if (selectedIds.size > 0) {
      onDownload(Array.from(selectedIds))
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with Search and Filters */}
      <div className="border-b border-[#E5E5E5] p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, headlines, text..."
              className="w-full h-9 pl-10 pr-4 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
            />
          </div>

          {/* View Toggle */}
          <div className="flex border border-[#E5E5E5]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'text-[#737373] hover:text-black'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-black text-white' : 'text-[#737373] hover:text-black'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="h-8 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
          >
            {ratingOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-8 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black bg-white"
            >
              <option value="created_at">Date</option>
              <option value="rating">Rating</option>
              <option value="batch_number">Batch #</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="h-8 px-2 border border-[#E5E5E5] text-sm hover:border-black"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-8 px-3 text-sm text-[#737373] hover:text-black flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          {/* Results count */}
          <span className="text-sm text-[#A3A3A3] ml-auto">
            {filteredConcepts.length} concept{filteredConcepts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredConcepts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[#A3A3A3]">No concepts found</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-black underline mt-2">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredConcepts.map((concept) => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                isSelected={selectedIds.has(concept.id)}
                onSelect={() => toggleSelection(concept.id)}
                onClick={() => onSelectConcept(concept.id)}
                onRate={(rating) => onSetRating(concept.id, rating)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select All Header */}
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-[#737373] uppercase tracking-wide">
              <button
                onClick={selectAll}
                className={`w-4 h-4 border flex items-center justify-center ${
                  selectedIds.size === filteredConcepts.length && filteredConcepts.length > 0
                    ? 'bg-black border-black text-white'
                    : 'border-[#D4D4D4]'
                }`}
              >
                {selectedIds.size === filteredConcepts.length && filteredConcepts.length > 0 && (
                  <Check className="w-3 h-3" />
                )}
              </button>
              <span className="w-24">Batch</span>
              <span className="w-20">Status</span>
              <span className="flex-1">Headline</span>
              <span className="w-24">Rating</span>
              <span className="w-24">Date</span>
            </div>

            {filteredConcepts.map((concept) => (
              <ConceptRow
                key={concept.id}
                concept={concept}
                isSelected={selectedIds.has(concept.id)}
                onSelect={() => toggleSelection(concept.id)}
                onClick={() => onSelectConcept(concept.id)}
                onRate={(rating) => onSetRating(concept.id, rating)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="border-t border-[#E5E5E5] bg-white p-4">
          <div className="flex items-center justify-between max-w-[720px] mx-auto">
            <span className="text-sm">
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadSelected}>
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Grid Card Component
function ConceptCard({
  concept,
  isSelected,
  onSelect,
  onClick,
  onRate
}: {
  concept: AdConcept
  isSelected: boolean
  onSelect: () => void
  onClick: () => void
  onRate: (rating: number) => void
}) {
  return (
    <div
      className={`border ${isSelected ? 'border-black' : 'border-[#E5E5E5]'} hover:border-[#D4D4D4] transition-colors`}
    >
      {/* Selection + Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#E5E5E5]">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`w-4 h-4 border flex items-center justify-center ${
            isSelected ? 'bg-black border-black text-white' : 'border-[#D4D4D4]'
          }`}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>
        <span className={`text-xs px-2 py-0.5 ${statusColors[concept.status]}`}>
          {concept.status}
        </span>
      </div>

      {/* Content - Clickable */}
      <button onClick={onClick} className="w-full text-left p-3 space-y-2">
        <div className="text-sm font-medium">{concept.batch_number}</div>

        {concept.headlines?.[0] && (
          <p className="text-xs text-[#737373] line-clamp-2">
            {concept.headlines[0]}
          </p>
        )}

        {concept.primary_texts?.[0] && (
          <p className="text-xs text-[#A3A3A3] line-clamp-2">
            {concept.primary_texts[0].substring(0, 100)}...
          </p>
        )}
      </button>

      {/* Footer with Rating */}
      <div className="flex items-center justify-between p-3 border-t border-[#E5E5E5]">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={(e) => { e.stopPropagation(); onRate(star); }}
              className="p-0.5"
            >
              <Star
                className={`w-3 h-3 ${
                  concept.rating && star <= concept.rating
                    ? 'fill-black text-black'
                    : 'text-[#D4D4D4] hover:text-[#A3A3A3]'
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-xs text-[#A3A3A3]">
          {new Date(concept.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

// List Row Component
function ConceptRow({
  concept,
  isSelected,
  onSelect,
  onClick,
  onRate
}: {
  concept: AdConcept
  isSelected: boolean
  onSelect: () => void
  onClick: () => void
  onRate: (rating: number) => void
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-3 border ${
        isSelected ? 'border-black bg-[#FAFAFA]' : 'border-[#E5E5E5]'
      } hover:border-[#D4D4D4] transition-colors`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-black border-black text-white' : 'border-[#D4D4D4]'
        }`}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </button>

      <button onClick={onClick} className="w-24 text-left">
        <span className="text-sm font-medium">{concept.batch_number}</span>
      </button>

      <span className={`w-20 text-xs px-2 py-0.5 text-center ${statusColors[concept.status]}`}>
        {concept.status}
      </span>

      <button onClick={onClick} className="flex-1 text-left min-w-0">
        <p className="text-sm truncate">
          {concept.headlines?.[0] || 'No headline'}
        </p>
      </button>

      <div className="w-24 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={(e) => { e.stopPropagation(); onRate(star); }}
            className="p-0.5"
          >
            <Star
              className={`w-3 h-3 ${
                concept.rating && star <= concept.rating
                  ? 'fill-black text-black'
                  : 'text-[#D4D4D4] hover:text-[#A3A3A3]'
              }`}
            />
          </button>
        ))}
      </div>

      <span className="w-24 text-xs text-[#A3A3A3] text-right">
        {new Date(concept.created_at).toLocaleDateString()}
      </span>
    </div>
  )
}
