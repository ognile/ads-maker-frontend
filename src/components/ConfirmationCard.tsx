import { useState } from 'react'
import { Check, X, Loader2, AlertCircle, Image as ImageIcon, FileText, BarChart3 } from 'lucide-react'
import { Button } from './ui/button'

interface Confirmation {
  id: string
  conversation_id: string
  action_type: string
  action_data: any
  status: string
  created_at: string
}

interface ConfirmationCardProps {
  confirmation: Confirmation
  onConfirm: () => Promise<void>
  onCancel: () => Promise<void>
}

const ACTION_LABELS: Record<string, { label: string; icon: typeof ImageIcon; color: string }> = {
  create_ads: {
    label: 'Create Ads',
    icon: ImageIcon,
    color: 'bg-blue-50 border-blue-200',
  },
  analyze_ads: {
    label: 'Analyze Ads',
    icon: BarChart3,
    color: 'bg-purple-50 border-purple-200',
  },
  push_to_fb: {
    label: 'Push to Facebook',
    icon: FileText,
    color: 'bg-green-50 border-green-200',
  },
}

export function ConfirmationCard({ confirmation, onConfirm, onCancel }: ConfirmationCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const actionConfig = ACTION_LABELS[confirmation.action_type] || {
    label: confirmation.action_type,
    icon: AlertCircle,
    color: 'bg-gray-50 border-gray-200',
  }

  const Icon = actionConfig.icon

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await onCancel()
    } finally {
      setIsCancelling(false)
    }
  }

  // Render action-specific content
  const renderActionContent = () => {
    const data = confirmation.action_data

    switch (confirmation.action_type) {
      case 'create_ads':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#737373]">Count:</span>
              <span className="font-medium">{data.count || 1}</span>
            </div>
            {data.product_id && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#737373]">Product:</span>
                <span className="font-medium">{data.product_id}</span>
              </div>
            )}
          </div>
        )

      case 'analyze_ads':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#737373]">Period:</span>
              <span className="font-medium">{data.date_preset || 'last_7d'}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#737373]">Min Spend:</span>
              <span className="font-medium">${data.spend_threshold || 50}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#737373]">ROAS Threshold:</span>
              <span className="font-medium">{data.roas_threshold || 1.5}</span>
            </div>
          </div>
        )

      case 'push_to_fb':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#737373]">Concepts:</span>
              <span className="font-medium">{data.concept_ids?.length || 0}</span>
            </div>
            {data.adset_id && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#737373]">Ad Set:</span>
                <span className="font-medium font-mono text-xs">{data.adset_id}</span>
              </div>
            )}
            {/* Thumbnails if available */}
            {data.thumbnails && data.thumbnails.length > 0 && (
              <div className="flex gap-2 mt-2">
                {data.thumbnails.slice(0, 4).map((thumb: string, i: number) => (
                  <img
                    key={i}
                    src={thumb}
                    alt={`Concept ${i + 1}`}
                    className="w-16 h-16 object-cover border border-[#E5E5E5]"
                  />
                ))}
                {data.thumbnails.length > 4 && (
                  <div className="w-16 h-16 bg-[#F5F5F5] flex items-center justify-center text-sm text-[#737373]">
                    +{data.thumbnails.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      default:
        return (
          <pre className="text-xs bg-[#FAFAFA] p-2 overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )
    }
  }

  return (
    <div className={`border p-4 ${actionConfig.color}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{actionConfig.label}</span>
        <span className="text-xs text-[#A3A3A3] ml-auto">
          Pending confirmation
        </span>
      </div>

      {/* Content */}
      <div className="mb-4">
        {renderActionContent()}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleConfirm}
          disabled={isConfirming || isCancelling}
          size="sm"
          className="flex-1"
        >
          {isConfirming ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Confirm
        </Button>
        <Button
          onClick={handleCancel}
          disabled={isConfirming || isCancelling}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <X className="w-4 h-4 mr-2" />
          )}
          Cancel
        </Button>
      </div>
    </div>
  )
}
