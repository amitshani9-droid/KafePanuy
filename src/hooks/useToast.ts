import { useCallback, useState } from 'react'
import type { ToastMessage } from '../components/Toast'

export type ToastInput = Omit<ToastMessage, 'id'>
export type Notify = (toast: ToastInput) => void

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const notify = useCallback<Notify>((t) => setToast({ ...t, id: Date.now() + Math.random() }), [])
  const clear = useCallback(() => setToast(null), [])
  return { toast, notify, clear }
}
