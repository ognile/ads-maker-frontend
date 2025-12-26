import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'

interface GenerateModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (params: {
    product: string
    awareness_stage: string
    angle: string
    avatar: string
    landing_page_url: string
    hypothesis?: string
  }) => void
  isLoading: boolean
}

const AWARENESS_STAGES = [
  'Unaware',
  'ProblemAware',
  'SolutionAware',
  'ProductAware',
]

const PRODUCTS = [
  'NUORA',
  'CAPSULE',
]

export function GenerateModal({ open, onClose, onGenerate, isLoading }: GenerateModalProps) {
  const [product, setProduct] = useState('NUORA')
  const [awarenessStage, setAwarenessStage] = useState('SolutionAware')
  const [angle, setAngle] = useState('')
  const [avatar, setAvatar] = useState('')
  const [landingPageUrl, setLandingPageUrl] = useState('https://mynuora.com/pages/science-listicle-01')
  const [hypothesis, setHypothesis] = useState('')

  const handleSubmit = () => {
    if (angle.trim() && avatar.trim() && landingPageUrl.trim()) {
      onGenerate({
        product,
        awareness_stage: awarenessStage,
        angle: angle.trim(),
        avatar: avatar.trim(),
        landing_page_url: landingPageUrl.trim(),
        hypothesis: hypothesis.trim() || undefined,
      })
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate New Ad Batch
          </DialogTitle>
          <DialogDescription>
            Configure the parameters for AI ad generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product</label>
            <div className="flex gap-2">
              {PRODUCTS.map((p) => (
                <Button
                  key={p}
                  variant={product === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProduct(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {/* Awareness Stage */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Awareness Stage</label>
            <div className="flex flex-wrap gap-2">
              {AWARENESS_STAGES.map((stage) => (
                <Button
                  key={stage}
                  variant={awarenessStage === stage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAwarenessStage(stage)}
                >
                  {stage}
                </Button>
              ))}
            </div>
          </div>

          {/* Angle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Angle (short slug)</label>
            <Input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g., BiofilmShield, IntimacyAnxiety, PostPeriodBV"
            />
            <p className="text-xs text-muted-foreground">
              The main hook or mechanism you want to test
            </p>
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Avatar (desire-based)</label>
            <Input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="e.g., WantsToSmellGreat, WantsDrynessRelief, WantsConfidence"
            />
            <p className="text-xs text-muted-foreground">
              Core desire of the target customer
            </p>
          </div>

          {/* Landing Page URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Landing Page URL</label>
            <Input
              value={landingPageUrl}
              onChange={(e) => setLandingPageUrl(e.target.value)}
              placeholder="https://mynuora.com/pages/..."
            />
          </div>

          {/* Hypothesis */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hypothesis (optional)</label>
            <Textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="What are you testing with this ad? e.g., 'Testing if menopause demographic responds better to intimacy angle than odor angle'"
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!angle.trim() || !avatar.trim() || !landingPageUrl.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Ads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
