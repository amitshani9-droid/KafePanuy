import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/** Bottom sheet on mobile, centered dialog on desktop. */
export default function Modal({ title, onClose, children, footer }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Keep the latest onClose without re-running the setup below (callers often pass inline
  // functions; re-running would steal focus back to the panel on every render).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Capture phase + stopPropagation so Esc closes only the modal, not the drawer behind it
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      // Focus trap: Tab / Shift+Tab cycle inside the dialog
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      } else if (!panelRef.current.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center md:items-center md:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[36px] bg-cream shadow-[0_-16px_50px_rgba(0,0,0,0.25)] outline-none animate-drawer-up md:max-h-[88dvh] md:max-w-lg md:rounded-3xl md:animate-pop-in"
      >
        <div className="flex justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-forest/25 shadow-xs" />
        </div>
        <header className="flex items-start gap-3 px-5 pt-2 pb-2 md:pt-5">
          <h2 id={titleId} className="min-w-0 flex-1 font-display text-xl font-bold text-forest">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-2xl bg-surface text-forest shadow-xs ring-1 ring-forest/15 hover:bg-oat active:scale-90 transition-all"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 touch-scroll">{children}</div>
        {footer && (
          <footer className="border-t border-forest/10 bg-cream/95 backdrop-blur-xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
