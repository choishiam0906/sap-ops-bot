import { useCallback } from 'react'
import { useToastStore } from '../stores/toastStore.js'
import type { ToastVariant } from '../stores/toastStore.js'

export function useToast() {
  const addToast = useToastStore((s) => s.addToast)

  const toast = useCallback(
    (variant: ToastVariant, message: string, duration?: number) =>
      addToast(variant, message, duration),
    [addToast],
  )

  return {
    toast,
    success: useCallback((msg: string, dur?: number) => addToast('success', msg, dur), [addToast]),
    error: useCallback((msg: string, dur?: number) => addToast('error', msg, dur), [addToast]),
    warning: useCallback((msg: string, dur?: number) => addToast('warning', msg, dur), [addToast]),
    info: useCallback((msg: string, dur?: number) => addToast('info', msg, dur), [addToast]),
  }
}
