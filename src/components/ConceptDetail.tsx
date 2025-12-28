import { useState } from 'react'
import { ChevronDown, ChevronUp, X, Star, Copy, Check, Download, Trash2, Send } from 'lucide-react'
import { Button } from './ui/button'
import { PushToFBWizard } from './PushToFBWizard'
import type { AdConcept, Product } from '../App'

interface ConceptDetailProps {
  concept: AdConcept | null
  product?: Product | null
  onApprove: (id: string) => void
  onReject: (id: string, feedback: string) => void
  onAddNotes: (id: string, notes: string) => void
  onSetRating: (id: string, rating: number) => void
  onDelete: (id: string) => void
  isApproving: boolean
  isDeleting?: boolean
}

// Copy button with feedback
function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1 transition-colors ${copied ? 'text-black' : 'text-[#A3A3A3] hover:text-black'} ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

export function ConceptDetail({
  concept,
  product,
  onApprove,
  onReject,
  onAddNotes,
  onSetRating,
  onDelete,
  isApproving,
  isDeleting = false
}: ConceptDetailProps) {
  const [expandedText, setExpandedText] = useState<number | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [notes, setNotes] = useState('')
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; prompt?: string } | null>(null)
  const [researchExpanded, setResearchExpanded] = useState(false)
  const [originalExpanded, setOriginalExpanded] = useState(false)
  const [changelogExpanded, setChangelogExpanded] = useState(false)
  const [reviewExpanded, setReviewExpanded] = useState(false)

  // Facebook Push wizard
  const [fbWizardOpen, setFbWizardOpen] = useState(false)

  if (!concept) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-[#A3A3A3]">Select a concept to review</p>
      </div>
    )
  }

  const isReady = concept.status === 'ready'
  const isProcessing = ['researching', 'generating', 'reviewing'].includes(concept.status)

  const handleReject = () => {
    if (feedback.trim()) {
      onReject(concept.id, feedback.trim())
      setFeedback('')
      setRejectModalOpen(false)
    }
  }

  const handleSaveNotes = () => {
    if (notes.trim()) {
      onAddNotes(concept.id, notes.trim())
      setNotes('')
      setNotesModalOpen(false)
    }
  }

  const handleRating = (rating: number) => {
    onSetRating(concept.id, rating)
  }

  const handleDownloadAll = () => {
    // Create text content for download
    let content = `Batch: ${concept.batch_number}\n`
    content += `Status: ${concept.status}\n`
    content += `Created: ${new Date(concept.created_at).toLocaleDateString()}\n\n`

    if (concept.headlines?.length) {
      content += `=== HEADLINES ===\n`
      concept.headlines.forEach((h, i) => {
        content += `V${String(i + 1).padStart(2, '0')}: ${h}\n`
      })
      content += `\n`
    }

    if (concept.primary_texts?.length) {
      content += `=== PRIMARY TEXT ===\n`
      concept.primary_texts.forEach((t, i) => {
        content += `V${String(i + 1).padStart(2, '0')}:\n${t}\n\n`
      })
    }

    if (concept.hypothesis) {
      const h = concept.hypothesis as any
      content += `=== HYPOTHESIS ===\n`
      content += `${h.hypothesis || ''}\n`
      if (h.reasoning) content += `Reasoning: ${h.reasoning}\n`
      if (h.target_avatar) content += `Target: ${h.target_avatar}\n`
      if (h.angle) content += `Angle: ${h.angle}\n`
    }

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${concept.batch_number}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[720px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{concept.batch_number}</h2>
            <p className="text-sm text-[#737373]">{concept.status}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Rating */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-4 h-4 ${
                      concept.rating && star <= concept.rating
                        ? 'fill-black text-black'
                        : 'text-[#D4D4D4] hover:text-[#A3A3A3]'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Download button */}
            <button
              onClick={handleDownloadAll}
              className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
              title="Download all content"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Delete button */}
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="p-1 text-[#A3A3A3] hover:text-red-600 transition-colors"
              title="Delete concept"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {concept.drive_folder_id && (
              <a
                href={`https://drive.google.com/drive/folders/${concept.drive_folder_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#737373] hover:text-black underline"
              >
                View in Drive
              </a>
            )}
          </div>
        </div>

        {/* Research - Hypothesis & Patterns */}
        {(concept.hypothesis || concept.patterns_used) && (
          <div className="space-y-2">
            <button
              onClick={() => setResearchExpanded(!researchExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                Research & Hypothesis
              </h3>
              {researchExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
              )}
            </button>

            {researchExpanded && (
              <div className="border border-[#E5E5E5] p-4 space-y-4">
                {/* Hypothesis */}
                {concept.hypothesis && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-[#A3A3A3]">Hypothesis</h4>
                    <p className="text-sm">{(concept.hypothesis as any).hypothesis || JSON.stringify(concept.hypothesis)}</p>
                    {(concept.hypothesis as any).reasoning && (
                      <p className="text-xs text-[#737373]">{(concept.hypothesis as any).reasoning}</p>
                    )}
                    {(concept.hypothesis as any).confidence && (
                      <p className="text-xs text-[#A3A3A3]">
                        Confidence: {(concept.hypothesis as any).confidence}%
                      </p>
                    )}
                    {(concept.hypothesis as any).awareness_stage && (
                      <p className="text-xs text-[#A3A3A3]">
                        Awareness: {(concept.hypothesis as any).awareness_stage}
                      </p>
                    )}
                    {(concept.hypothesis as any).target_avatar && (
                      <p className="text-xs text-[#A3A3A3]">
                        Target: {(concept.hypothesis as any).target_avatar}
                      </p>
                    )}
                    {(concept.hypothesis as any).angle && (
                      <p className="text-xs text-[#A3A3A3]">
                        Angle: {(concept.hypothesis as any).angle}
                      </p>
                    )}
                    {concept.hypothesis.format_id && (
                      <p className="text-xs text-[#A3A3A3]">
                        Format: <span className="font-medium text-[#8B5CF6]">{concept.hypothesis.format_id}</span>
                      </p>
                    )}
                    {concept.hypothesis.format_reasoning && (
                      <p className="text-xs text-[#737373] italic mt-1">
                        {concept.hypothesis.format_reasoning}
                      </p>
                    )}
                  </div>
                )}

                {/* Patterns */}
                {concept.patterns_used && concept.patterns_used.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-[#A3A3A3]">Patterns Used</h4>
                    {concept.patterns_used.map((pattern: any, i: number) => (
                      <div key={i} className="text-xs space-y-1 pb-2 border-b border-[#F5F5F5] last:border-0">
                        <p className="font-medium">{pattern.pattern}</p>
                        <p className="text-[#A3A3A3]">
                          {pattern.mentions} mentions | {pattern.emotional_valence} emotional valence
                        </p>
                        {pattern.example_quotes && pattern.example_quotes.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {pattern.example_quotes.slice(0, 2).map((quote: string, j: number) => (
                              <p key={j} className="text-[#737373] italic">"{quote.substring(0, 100)}{quote.length > 100 ? '...' : ''}"</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#A3A3A3]">Processing...</p>
          </div>
        )}

        {/* Images */}
        {concept.images && concept.images.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">Images</h3>
            <div className="flex gap-4">
              {concept.images.map((img, i) => {
                const imgSrc = img.startsWith('data:') || img.startsWith('http') ? img : `data:image/png;base64,${img}`
                const prompt = concept.image_prompts?.[i]
                return (
                  <div key={i} className="space-y-1">
                    <button
                      onClick={() => setEnlargedImage({ url: imgSrc, prompt })}
                      className="border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors"
                    >
                      <img
                        src={imgSrc}
                        alt={`Generated ${i + 1}`}
                        className="w-32 h-32 object-cover"
                      />
                    </button>
                    {prompt && (
                      <button
                        onClick={() => setEnlargedImage({ url: imgSrc, prompt })}
                        className="text-xs text-[#A3A3A3] hover:text-[#737373] max-w-[128px] line-clamp-2 text-left cursor-pointer"
                      >
                        {prompt}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Primary Text (Revised) */}
        {concept.primary_texts && concept.primary_texts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
              Primary Text {concept.revision_changelog && concept.revision_changelog.length > 0 ? '(Revised)' : ''}
            </h3>
            {concept.primary_texts.map((text, i) => {
              const isExpanded = expandedText === i
              return (
                <div key={i} className="border border-[#E5E5E5]">
                  <div className="p-4 flex items-start justify-between gap-4">
                    <button
                      onClick={() => setExpandedText(isExpanded ? null : i)}
                      className="flex-1 text-left"
                    >
                      <span className="text-xs text-[#A3A3A3] mb-1 block">V{String(i + 1).padStart(2, '0')}</span>
                      <p className={`text-sm ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                        {text}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <CopyButton text={text} />
                      <button
                        onClick={() => setExpandedText(isExpanded ? null : i)}
                        className="p-1 text-[#A3A3A3]"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Review Agent Changelog */}
        {concept.revision_changelog && concept.revision_changelog.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setChangelogExpanded(!changelogExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                Review Agent Changes ({concept.revision_changelog.length})
              </h3>
              {changelogExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
              )}
            </button>

            {changelogExpanded && (
              <div className="border border-[#E5E5E5] divide-y divide-[#F5F5F5]">
                {concept.revision_changelog.map((change, i) => (
                  <div key={i} className="p-3 space-y-2">
                    <div className="text-xs text-[#A3A3A3]">Change {i + 1}</div>
                    <div className="space-y-1">
                      <div className="flex gap-2">
                        <span className="text-xs text-red-500 font-medium shrink-0">−</span>
                        <p className="text-sm text-red-600 line-through">{change.original}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-xs text-green-500 font-medium shrink-0">+</span>
                        <p className="text-sm text-green-600">{change.revised}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#737373] italic">{change.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Original Text (Before Review) */}
        {concept.original_primary_text && (
          <div className="space-y-2">
            <button
              onClick={() => setOriginalExpanded(!originalExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                Original Text (Before Review)
              </h3>
              {originalExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
              )}
            </button>

            {originalExpanded && (
              <div className="border border-[#E5E5E5] p-4 bg-[#FAFAFA]">
                <div className="flex justify-end mb-2">
                  <CopyButton text={concept.original_primary_text} />
                </div>
                <p className="text-sm whitespace-pre-wrap text-[#737373]">{concept.original_primary_text}</p>
              </div>
            )}
          </div>
        )}

        {/* Headlines */}
        {concept.headlines && concept.headlines.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">Headlines</h3>
            <div className="space-y-2">
              {concept.headlines.map((headline, i) => (
                <div key={i} className="border border-[#E5E5E5] p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs text-[#A3A3A3] mr-2">V{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-sm">{headline}</span>
                  </div>
                  <CopyButton text={headline} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Principle Check */}
        {concept.principle_check && (
          <div className="space-y-2">
            <button
              onClick={() => setReviewExpanded(!reviewExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                Review {concept.principle_check.score !== undefined && `(${concept.principle_check.score}/100)`}
              </h3>
              {reviewExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#A3A3A3]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
              )}
            </button>

            {reviewExpanded && (
              <div className="border border-[#E5E5E5] p-4 space-y-3">
                {concept.principle_check.overall && (
                  <p className="text-sm text-[#737373]">{concept.principle_check.overall}</p>
                )}
                {concept.principle_check.strengths && concept.principle_check.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#A3A3A3] mb-1">Strengths</p>
                    <ul className="text-sm text-[#737373] space-y-1">
                      {concept.principle_check.strengths.map((s, i) => (
                        <li key={i}>+ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {concept.principle_check.issues && concept.principle_check.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#A3A3A3] mb-1">Issues</p>
                    <ul className="text-sm space-y-2">
                      {concept.principle_check.issues.map((issue, i) => (
                        <li key={i} className="text-[#737373]">
                          <span className="font-medium">{issue.rule}:</span> {issue.problem}
                          {issue.fix && <span className="block text-xs mt-0.5">Fix: {issue.fix}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {concept.principle_check.ai_slop_detected && concept.principle_check.ai_slop_detected.length > 0 && (
                  <div className="text-sm">
                    <span className="text-[#737373]">AI slop detected: </span>
                    <span className="text-red-600">{concept.principle_check.ai_slop_detected.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Notes */}
        {concept.user_notes && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">Notes</h3>
            <div className="border border-[#E5E5E5] p-4">
              <p className="text-sm whitespace-pre-wrap">{concept.user_notes}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {isReady && (
          <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setNotes(concept.user_notes || '')
                setNotesModalOpen(true)
              }}
            >
              Add Notes
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRejectModalOpen(true)}
            >
              Reject
            </Button>
            <Button
              className="flex-1"
              onClick={() => onApprove(concept.id)}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        )}

        {/* Push to FB for approved concepts */}
        {concept.status === 'approved' && (
          <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
            <Button
              className="flex-1"
              onClick={() => setFbWizardOpen(true)}
            >
              <Send className="w-4 h-4 mr-2" />
              Push to Facebook
            </Button>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Reject Concept</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-[#A3A3A3] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What's wrong with this concept? Be specific..."
                className="w-full h-32 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setRejectModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleReject} disabled={!feedback.trim()}>
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Add Notes</h3>
              <button onClick={() => setNotesModalOpen(false)} className="text-[#A3A3A3] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for AI learning (won't reject the concept)..."
                className="w-full h-32 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setNotesModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveNotes} disabled={!notes.trim()}>
                  Save Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Modal with Prompt */}
      {enlargedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image */}
            <img
              src={enlargedImage.url}
              alt="Enlarged"
              className="max-w-full max-h-[70vh] object-contain rounded"
            />

            {/* Prompt section */}
            {enlargedImage.prompt && (
              <div className="mt-4 bg-white/10 backdrop-blur rounded p-4 max-w-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-white/50 uppercase tracking-wide mb-2">Image Prompt</p>
                    <p className="text-sm text-white leading-relaxed">{enlargedImage.prompt}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(enlargedImage.prompt || '')
                    }}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
                    title="Copy prompt"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-sm m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">Delete Concept</h3>
              <button onClick={() => setDeleteModalOpen(false)} className="text-[#A3A3A3] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-[#737373]">
                Delete <span className="font-medium text-black">{concept.batch_number}</span>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    onDelete(concept.id)
                    setDeleteModalOpen(false)
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Push to Facebook Wizard */}
      <PushToFBWizard
        concept={concept}
        product={product}
        isOpen={fbWizardOpen}
        onClose={() => setFbWizardOpen(false)}
        onSuccess={() => {
          // Could trigger a refetch of concept here if needed
        }}
      />
    </div>
  )
}
