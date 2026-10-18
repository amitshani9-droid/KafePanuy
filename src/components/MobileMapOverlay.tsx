import type { CartFilters } from '../hooks/useCartFilters'
import { LogoMark } from './BrandLogo'
import QuickChips from './QuickChips'
import SearchField from './SearchField'

interface MobileMapOverlayProps {
  filters: CartFilters
  onOpenFilters: () => void
  /** Hide the bottom "free now" pill (e.g. while the cart drawer is open) */
  hideCounter: boolean
  onShowFree: () => void
}

/** Height (px) the floating header takes, so map controls can sit below it. */
export const MOBILE_OVERLAY_HEIGHT = 124

/** Floating search + chips over the full-screen phone map, and a live "free now" pill. */
export default function MobileMapOverlay({ filters, onOpenFilters, hideCounter, onShowFree }: MobileMapOverlayProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] space-y-2 bg-gradient-to-b from-cream/95 via-cream/65 to-transparent px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <span
            className="shrink-0 flex items-center justify-center rounded-2xl bg-surface/90 p-1.5 shadow-[0_4px_16px_rgba(27,67,50,0.12)] ring-1 ring-forest/15 backdrop-blur-xl"
            title="קפה פנוי"
          >
            <LogoMark size="sm" />
          </span>
          <SearchField value={filters.query} onChange={filters.setQuery} floating />
        </div>
        <div className="pointer-events-auto">
          <QuickChips filters={filters} onOpenFilters={onOpenFilters} floating />
        </div>
      </div>

      {!hideCounter && (
        <button
          type="button"
          onClick={onShowFree}
          className="absolute start-3.5 bottom-4 z-[1000] flex items-center gap-2.5 rounded-full bg-surface/92 px-4 py-2.5 text-xs font-bold text-forest shadow-[0_8px_24px_rgba(27,67,50,0.14)] ring-1 ring-forest/15 backdrop-blur-xl transition-all duration-150 active:scale-95"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-calm animate-live-dot opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-calm" />
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded-full bg-calm/15 px-1.5 py-0.5 font-display text-xs font-bold text-calm-ink">
              {filters.freeCount}
            </span>
            <span>פנויות עכשיו ☕</span>
          </span>
        </button>
      )}
    </>
  )
}
