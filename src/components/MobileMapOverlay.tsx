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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] space-y-2 bg-gradient-to-b from-cream/85 via-cream/40 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-surface p-1 shadow-lg ring-1 ring-forest/10" title="קפה פנוי">
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
          className="absolute start-3 bottom-4 z-[1000] flex items-center gap-2 rounded-full bg-surface px-4 py-3 text-sm font-bold text-forest shadow-lg ring-1 ring-forest/10 transition active:scale-95"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-calm animate-live-dot" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-calm" />
          </span>
          <span>
            <span className="font-display">{filters.freeCount}</span> פנויות עכשיו
          </span>
        </button>
      )}
    </>
  )
}
