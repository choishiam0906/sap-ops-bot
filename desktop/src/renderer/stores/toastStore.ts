import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  duration: number // 0이면 수동 닫기만
}

interface ToastState {
  toasts: Toast[]
  addToast: (variant: ToastVariant, message: string, duration?: number) => string
  removeToast: (id: string) => void
}

const MAX_TOASTS = 5

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (variant, message, duration = 4000) => {
    const id = crypto.randomUUID()
    set((state) => {
      const next = [...state.toasts, { id, variant, message, duration }]
      // 최대 개수 초과 시 오래된 것부터 제거
      return { toasts: next.slice(-MAX_TOASTS) }
    })
    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))
