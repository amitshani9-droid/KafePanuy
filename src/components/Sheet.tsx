import { useRef, type ReactNode } from 'react'

export type Snap = 'min' | 'peek' | 'full'

const ORDER: Snap[] = ['min', 'peek', 'full']

/** Height of each snap point on phones */
export function snapHeight(snap: Snap, viewportH: number, tall = false): number {
  if (snap === 'min') return 104
  if (snap === 'peek') return Math.round(tall ? Math.min(viewportH * 0.62, 560) : Math.min(viewportH * 0.42, 380))
  return Math.round(viewportH * 0.88)
}

interface Props {
  snap: Snap
  onSnap: (s: Snap) => void
  viewportH: number
  isDesktop: boolean
  /** Use the taller peek height (place details) */
  tall?: boolean
  children: ReactNode
}

/**
 * Phones: bottom sheet with a drag handle (min / peek / full).
 * Desktop: a floating side panel on the start side.
 */
export function Sheet({ snap, onSnap, viewportH, isDesktop, tall = false, children }: Props) {
  const start = useRef<{ y: number; t: number } | null>(null)

  if (isDesktop) {
    return (
      <aside className="absolute top-20 bottom-4 start-4 z-[1100] flex w-[400px] flex-col overflow-hidden rounded-3xl bg-surface shadow-xl ring-1 ring-line">
        <div className="flex-1 overflow-y-auto overscroll-contain pt-3">{children}</div>
      </aside>
    )
  }

  const move = (dir: 1 | -1) => {
    const i = ORDER.indexOf(snap)
    onSnap(ORDER[Math.min(ORDER.length - 1, Math.max(0, i + dir))])
  }

  return (
    <section
      className="absolute inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-3xl bg-surface shadow-[0_-6px_24px_rgb(0_0_0/0.14)] transition-[height] duration-200 ease-out"
      style={{ height: snapHeight(snap, viewportH, tall) }}
    >
      <button
        type="button"
        aria-label={snap === 'full' ? 'הקטנת הרשימה' : 'הגדלת הרשימה'}
        className="flex h-6 w-full shrink-0 touch-none items-center justify-center"
        onPointerDown={(e) => {
          start.current = { y: e.clientY, t: Date.now() }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          const s = start.current
          start.current = null
          if (!s) return
          const dy = e.clientY - s.y
          if (Math.abs(dy) < 8) move(snap === 'full' ? -1 : 1)
          else move(dy < 0 ? 1 : -1)
        }}
      >
        <span className="h-1.5 w-10 rounded-full bg-line" />
      </button>
      <div className={`flex-1 overscroll-contain ${snap === 'min' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {children}
      </div>
    </section>
  )
}
