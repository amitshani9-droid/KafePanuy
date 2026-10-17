import { useEffect, type CSSProperties } from 'react'

export interface ToastMessage {
  id: number
  title: string
  subtitle?: string
  emoji?: string
  celebrate?: boolean
}

interface ToastProps {
  toast: ToastMessage | null
  onDone: () => void
}

const CONFETTI = ['☕', '🎉', '✨', '🥐', '⭐', '🌿', '🎉', '✨']

export default function Toast({ toast, onDone }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(onDone, 3800)
    return () => window.clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[4000] flex justify-center px-4" role="status" aria-live="polite">
      <div key={toast.id} className="relative animate-toast-in">
        {toast.celebrate && (
          <div className="absolute inset-0" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="confetti absolute top-1/2 left-1/2 text-lg"
                style={{ '--angle': `${(360 / CONFETTI.length) * i}deg`, animationDelay: `${i * 30}ms` } as CSSProperties}
              >
                {c}
              </span>
            ))}
          </div>
        )}
        <div className="pointer-events-auto relative flex items-center gap-3 rounded-2xl bg-forest px-4 py-3 text-cream shadow-2xl ring-1 ring-white/10">
          {toast.emoji && <span className="text-2xl" aria-hidden="true">{toast.emoji}</span>}
          <div>
            <div className="font-display font-bold">{toast.title}</div>
            {toast.subtitle && <div className="text-sm text-cream/80">{toast.subtitle}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
