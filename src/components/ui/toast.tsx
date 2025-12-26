import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, Check, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, action?: Toast['action']) => void
  success: (message: string, action?: Toast['action']) => void
  error: (message: string, action?: Toast['action']) => void
  info: (message: string, action?: Toast['action']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, action?: Toast['action']) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message, action }])

    // Auto-remove after 4 seconds
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  const value: ToastContextValue = {
    toast: addToast,
    success: (message, action) => addToast('success', message, action),
    error: (message, action) => addToast('error', message, action),
    info: (message, action) => addToast('info', message, action),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  }

  const styles = {
    success: 'border-black bg-white',
    error: 'border-red-500 bg-red-50',
    info: 'border-[#E5E5E5] bg-white',
  }

  const iconStyles = {
    success: 'text-black',
    error: 'text-red-500',
    info: 'text-[#737373]',
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border shadow-sm min-w-[280px] max-w-[400px] animate-slide-in ${styles[toast.type]}`}
    >
      <span className={iconStyles[toast.type]}>{icons[toast.type]}</span>
      <span className="flex-1 text-sm">{toast.message}</span>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="text-sm font-medium underline hover:no-underline"
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} className="text-[#A3A3A3] hover:text-black">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
