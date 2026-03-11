import { useEffect, useRef } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '../../stores/toastStore.js'
import type { Toast as ToastType, ToastVariant } from '../../stores/toastStore.js'
import './Toast.css'

const ICON_MAP: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  error: <AlertCircle size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  info: <Info size={18} aria-hidden="true" />,
}

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        elRef.current?.classList.add('ui-toast-exit')
      }, toast.duration)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.duration])

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    elRef.current?.classList.add('ui-toast-exit')
  }

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName === 'toastSlideOutRight') {
      removeToast(toast.id)
    }
  }

  const role = toast.variant === 'error' ? 'alert' : 'status'

  return (
    <div
      ref={elRef}
      className={`ui-toast ui-toast-${toast.variant}`}
      role={role}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="ui-toast-icon">{ICON_MAP[toast.variant]}</span>
      <span className="ui-toast-message">{toast.message}</span>
      <button
        className="ui-toast-close"
        onClick={handleClose}
        aria-label="알림 닫기"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="ui-toast-container" aria-label="알림 목록">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
