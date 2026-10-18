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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-cream shadow-2xl outline-none animate-drawer-up md:max-h-[88dvh] md:max-w-lg md:rounded-3xl md:animate-pop-in"
      >
        <div className="flex justify-center pt-2 md:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-forest/20" />
        </div>
        <header className="flex items-start gap-3 px-5 pt-3 pb-2 md:pt-5">
          <h2 id={titleId} className="min-w-0 flex-1 font-display text-xl font-bold text-forest">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="shrink-0 rounded-full bg-surface p-2 text-forest shadow-sm ring-1 ring-forest/10 hover:bg-oat"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <footer className="border-t border-forest/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
