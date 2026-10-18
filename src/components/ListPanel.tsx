import type { ReactNode } from 'react'
import { ArrowUpDown } from 'lucide-react'
import type { LatLng, SortOption } from '../types/cart'
import { SORT_LABELS } from '../data/filters'
import type { RegionFilter } from '../data/regions'
import type { CartFilters } from '../hooks/useCartFilters'
import CartList from './CartList'
import QuickChips from './QuickChips'
import RegionSelector from './RegionSelector'
import SearchField from './SearchField'

interface ListPanelProps {
  variant: 'mobile' | 'desktop'
  filters: CartFilters
  loading: boolean
  origin: LatLng | null
  selectedId: string | null
  watches: string[]
  onSelect: (id: string) => void
  onReport: (id: string) => void
  onOpenFilters: () => void
  onRegionChange: (region: RegionFilter) => void
  onSortChange: (sort: SortOption) => void
  footer?: ReactNode
}

  function CardSkeleton() {
    return (
      <div className="animate-pulse overflow-hidden rounded-3xl bg-surface ring-1 ring-forest/10" aria-hidden="true">
        <div className="h-44 w-full bg-oat" />
        <div className="p-4 space-y-2.5">
          <div className="flex justify-between items-center gap-3">
            <div className="h-5 w-1/2 rounded bg-oat" />
            <div className="h-6 w-20 rounded-full bg-oat" />
          </div>
          <div className="h-3.5 w-1/3 rounded bg-oat" />
          <div className="h-3.5 w-4/5 rounded bg-oat" />
        </div>
      </div>
    )
  }

  function countLabel(n: number) {
    if (n === 0) return 'לא מצאנו עגלות'
    if (n === 1) return 'מצאנו עגלה אחת'
    return `מצאנו ${n} עגלות`
  }

  /** Search + filters + results. The desktop side column and the phone "רשימה" tab. */
  export default function ListPanel({
    variant,
    filters,
    loading,
    origin,
    selectedId,
    watches,
    onSelect,
    onReport,
    onOpenFilters,
    onRegionChange,
    onSortChange,
    footer,
  }: ListPanelProps) {
    const desktop = variant === 'desktop'
    return (
      <div className="flex h-full flex-col">
        <div
          className={`z-10 space-y-2.5 border-b border-forest/10 bg-cream/95 backdrop-blur-xl px-4 pb-3 ${
            desktop ? 'pt-3' : 'pt-[max(0.75rem,env(safe-area-inset-top))]'
          }`}
        >
          <SearchField value={filters.query} onChange={filters.setQuery} />
          <QuickChips filters={filters} onOpenFilters={desktop ? undefined : onOpenFilters} showTags={desktop} />
        </div>
        {desktop && <RegionSelector value={filters.region} onChange={onRegionChange} counts={filters.regionCounts} />}

        <div className="min-h-0 flex-1 overflow-y-auto touch-scroll pb-24">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 text-sm">
          <span className="text-ink/60" aria-live="polite">
            {loading ? 'טוענים עגלות…' : countLabel(filters.visibleCarts.length)}
          </span>
          <label className="relative flex items-center">
            <span className="sr-only">מיון</span>
            <ArrowUpDown size={14} className="pointer-events-none absolute start-2.5 text-forest/60" />
            <select
              value={filters.sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="cursor-pointer appearance-none rounded-full border-0 bg-surface py-1.5 ps-7 pe-3 text-sm font-bold text-forest ring-1 ring-forest/15 focus:ring-2 focus:ring-forest focus:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <CartList
            carts={filters.visibleCarts}
            origin={origin}
            selectedId={selectedId}
            onSelect={onSelect}
            onReport={onReport}
            watches={watches}
            onClearFilters={() => {
              filters.clearFilters()
              onRegionChange('all')
            }}
          />
        )}
        {footer}
      </div>
    </div>
  )
}
