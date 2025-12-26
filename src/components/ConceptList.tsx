import { Skeleton } from './ui/skeleton'
import type { AdConcept } from '../App'

interface ConceptListProps {
  concepts: AdConcept[]
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
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

export function ConceptList({ concepts, selectedId, onSelect, isLoading = false }: ConceptListProps) {
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 border-b border-[#E5E5E5] space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (concepts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-[#A3A3A3] text-center">
          No concepts yet.<br />
          Start working to generate.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {concepts.map((concept) => {
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
      })}
    </div>
  )
}
