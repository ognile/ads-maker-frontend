import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (feedback: string) => void
  isLoading: boolean
}

export function FeedbackModal({ open, onClose, onSubmit, isLoading }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('')

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit(feedback.trim())
      setFeedback('')
    }
  }

  const handleClose = () => {
    setFeedback('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>Reject Ad Batch</DialogTitle>
          <DialogDescription>
            Provide specific feedback so the AI can revise and improve the ads.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What's wrong with this ad? Be specific about:
- Copy issues (tone, length, hook, etc.)
- Image problems (style, subject, mood)
- Angle misalignment
- Brand voice issues"
            className="min-h-[150px]"
            disabled={isLoading}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!feedback.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              'Reject & Request Revision'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
