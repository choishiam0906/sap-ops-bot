import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 9999,
      }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const colors: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  }

  const c = colors[toast.type]

  return (
    <div
      role="alert"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        maxWidth: '360px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      {toast.message}
    </div>
  )
}
