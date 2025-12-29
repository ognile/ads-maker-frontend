import { useState, useMemo } from 'react'
import { Plus, Sparkles, X, Search, Grid, List, Star, Check, Trash2, CheckCircle, Facebook } from 'lucide-react'
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
  onSetRating?: (id: string, rating: number) => void
  onBulkApprove?: (ids: string[]) => void
  onBulkDelete?: (ids: string[]) => void
  onBulkPushFB?: (ids: string[]) => void
}

type ViewMode = 'list' | 'grid'
type SortBy = 'created_at' | 'rating' | 'batch_number'
type SortOrder = 'asc' | 'desc'

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

const statusBadgeColors: Record<string, string> = {
  researching: 'bg-[#F5F5F5] text-[#737373]',
  generating: 'bg-[#F5F5F5] text-[#737373]',
  reviewing: 'bg-[#F5F5F5] text-[#737373]',
  ready: 'bg-black text-white',
  approved: 'bg-[#E5E5E5] text-black',
  rejected: 'bg-[#FAFAFA] text-[#A3A3A3]',
}

const statusOptions = [
  { value: '', label: 'All Status' },
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

export function ConceptList({
  concepts,
  selectedId,
  onSelect,
  isLoading = false,
  isWorking = false,
  onCreateConcept,
  onSetRating,
  onBulkApprove,
  onBulkDelete,
  onBulkPushFB,
}: ConceptListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [ideas, setIdeas] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [minRating, setMinRating] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleCreate = () => {
    if (onCreateConcept) {
      onCreateConcept(ideas.trim() || undefined)
      setIdeas('')
      setShowCreateForm(false)
    }
  }

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
    if (statusFilter) {
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

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
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
    setStatusFilter('')
    setMinRating(0)
  }

  const hasActiveFilters = searchQuery || statusFilter || minRating > 0

  const handleBulkApprove = () => {
    if (onBulkApprove && selectedIds.size > 0) {
      onBulkApprove(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
    }
  }

  const handleBulkPushFB = () => {
    if (onBulkPushFB && selectedIds.size > 0) {
      onBulkPushFB(Array.from(selectedIds))
    }
  }

  // Count how many selected are approved (for push to FB)
  const selectedApprovedCount = useMemo(() => {
    return Array.from(selectedIds).filter(id => {
      const concept = concepts.find(c => c.id === id)
      return concept?.status === 'approved'
    }).length
  }, [selectedIds, concepts])

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

      {/* Search & Filters */}
      <div className="p-2 border-b border-[#E5E5E5] flex-shrink-0 space-y-2">
        {/* Search + View Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A3A3A3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1 text-xs border border-[#E5E5E5] focus:outline-none focus:border-black"
            />
          </div>
          <div className="flex border border-[#E5E5E5]">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 ${viewMode === 'list' ? 'bg-black text-white' : 'text-[#737373] hover:text-black'}`}
            >
              <List className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 ${viewMode === 'grid' ? 'bg-black text-white' : 'text-[#737373] hover:text-black'}`}
            >
              <Grid className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-1 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-[#E5E5E5] bg-white focus:outline-none focus:border-black"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="flex-1 px-2 py-1 text-xs border border-[#E5E5E5] bg-white focus:outline-none focus:border-black"
          >
            {ratingOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Sort Row */}
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="flex-1 px-2 py-1 text-xs border border-[#E5E5E5] bg-white focus:outline-none focus:border-black"
          >
            <option value="created_at">Date</option>
            <option value="rating">Rating</option>
            <option value="batch_number">Batch #</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-2 py-1 text-xs border border-[#E5E5E5] hover:border-black"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs text-[#737373] hover:text-black flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Result Count + Select All */}
        <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
          <span>{filteredConcepts.length} concept{filteredConcepts.length !== 1 ? 's' : ''}</span>
          {filteredConcepts.length > 0 && (
            <button
              onClick={selectAll}
              className="flex items-center gap-1 hover:text-black"
            >
              <div className={`w-3 h-3 border flex items-center justify-center ${
                selectedIds.size === filteredConcepts.length && filteredConcepts.length > 0
                  ? 'bg-black border-black text-white'
                  : 'border-[#D4D4D4]'
              }`}>
                {selectedIds.size === filteredConcepts.length && filteredConcepts.length > 0 && (
                  <Check className="w-2 h-2" />
                )}
              </div>
              <span>{selectedIds.size === filteredConcepts.length ? 'Deselect' : 'Select'} all</span>
            </button>
          )}
        </div>
      </div>

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
        ) : viewMode === 'list' ? (
          filteredConcepts.map((concept) => {
            const isSelected = concept.id === selectedId
            const isChecked = selectedIds.has(concept.id)
            const isReady = concept.status === 'ready'

            return (
              <div
                key={concept.id}
                className={`
                  w-full text-left px-3 py-2 border-b border-[#E5E5E5] transition-colors flex items-start gap-2
                  ${isSelected ? 'border-l-2 border-l-black bg-[#FAFAFA]' : 'border-l-2 border-l-transparent hover:bg-[#FAFAFA]'}
                `}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleSelection(concept.id, e)}
                  className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isChecked ? 'bg-black border-black text-white' : 'border-[#D4D4D4] hover:border-[#A3A3A3]'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3" />}
                </button>

                {/* Content */}
                <button
                  onClick={() => onSelect(concept.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected || isReady ? 'text-black' : 'text-[#737373]'}`}>
                      {concept.batch_number}
                    </span>
                    <span className={`text-xs ${statusColors[concept.status]}`}>
                      {statusLabels[concept.status]}
                    </span>
                  </div>
                  {concept.headlines?.[0] && (
                    <p className="text-xs text-[#A3A3A3] truncate mt-0.5">
                      {concept.headlines[0]}
                    </p>
                  )}
                </button>

                {/* Rating */}
                {onSetRating && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => { e.stopPropagation(); onSetRating(concept.id, star); }}
                        className="p-0.5"
                      >
                        <Star
                          className={`w-3 h-3 ${
                            concept.rating && star <= concept.rating
                              ? 'fill-black text-black'
                              : 'text-[#E5E5E5] hover:text-[#A3A3A3]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          // Grid View
          <div className="p-2 grid grid-cols-2 gap-2">
            {filteredConcepts.map((concept) => {
              const isChecked = selectedIds.has(concept.id)

              return (
                <div
                  key={concept.id}
                  className={`border ${isChecked ? 'border-black' : 'border-[#E5E5E5]'} hover:border-[#D4D4D4] transition-colors`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-2 border-b border-[#E5E5E5]">
                    <button
                      onClick={(e) => toggleSelection(concept.id, e)}
                      className={`w-4 h-4 border flex items-center justify-center ${
                        isChecked ? 'bg-black border-black text-white' : 'border-[#D4D4D4]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </button>
                    <span className={`text-xs px-1.5 py-0.5 ${statusBadgeColors[concept.status]}`}>
                      {concept.status}
                    </span>
                  </div>

                  {/* Content */}
                  <button onClick={() => onSelect(concept.id)} className="w-full text-left p-2 space-y-1">
                    <div className="text-xs font-medium">{concept.batch_number}</div>
                    {concept.headlines?.[0] && (
                      <p className="text-xs text-[#737373] line-clamp-2">
                        {concept.headlines[0]}
                      </p>
                    )}
                  </button>

                  {/* Footer */}
                  {onSetRating && (
                    <div className="flex items-center justify-between p-2 border-t border-[#E5E5E5]">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={(e) => { e.stopPropagation(); onSetRating(concept.id, star); }}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-2.5 h-2.5 ${
                                concept.rating && star <= concept.rating
                                  ? 'fill-black text-black'
                                  : 'text-[#D4D4D4] hover:text-[#A3A3A3]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-[#A3A3A3]">
                        {new Date(concept.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="border-t border-[#E5E5E5] bg-white p-2 flex-shrink-0">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium">{selectedIds.size} selected</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[#737373] hover:text-black"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-1">
            {onBulkApprove && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-7"
                onClick={handleBulkApprove}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
            )}
            {onBulkPushFB && selectedApprovedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-7"
                onClick={handleBulkPushFB}
              >
                <Facebook className="w-3 h-3 mr-1" />
                Push ({selectedApprovedCount})
              </Button>
            )}
            {onBulkDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-sm font-medium mb-2">Delete {selectedIds.size} concept{selectedIds.size > 1 ? 's' : ''}?</h3>
            <p className="text-xs text-[#737373] mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleBulkDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
