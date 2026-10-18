import type { ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { FILTER_TAG_ORDER, TAG_LABELS } from '../data/filters'
import { REGION_OPTIONS } from '../data/regions'
import type { CartFilters } from '../hooks/useCartFilters'

interface QuickChipsProps {
  filters: CartFilters
  /** Opens the full filter sheet (region, sort, all tags) */
  onOpenFilters?: () => void
  /** Show every tag inline (desktop list panel) instead of just the quick ones */
  showTags?: boolean
  floating?: boolean
}

function Chip({
  active,
  onClick,
  children,
  floating,
  label,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  floating?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 ${
        active
          ? 'bg-forest text-cream shadow-md shadow-forest/20 ring-1 ring-forest'
          : `${
              floating
                ? 'bg-surface/92 backdrop-blur-xl shadow-[0_4px_16px_rgba(58,36,24,0.08)]'
                : 'bg-surface shadow-xs'
            } text-forest ring-1 ring-forest/15 hover:bg-surface/95`
      }`}
    >
      {children}
    </button>
  )
}

export default function QuickChips({ filters, onOpenFilters, showTags = false, floating = false }: QuickChipsProps) {
  const region = REGION_OPTIONS.find((r) => r.value === filters.region)!
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      {onOpenFilters && (
        <Chip
          active={filters.activeFilterCount > 0}
          onClick={onOpenFilters}
          floating={floating}
          label={`כל הסינונים${filters.activeFilterCount ? ` (${filters.activeFilterCount} פעילים)` : ''}`}
        >
          <SlidersHorizontal size={15} />
          {filters.activeFilterCount > 0 && <span className="font-display font-bold">{filters.activeFilterCount}</span>}
        </Chip>
      )}
      <Chip active={filters.onlyFree} onClick={() => filters.setOnlyFree(!filters.onlyFree)} floating={floating}>
        פנוי עכשיו 🟢
      </Chip>
      <Chip active={filters.onlyDeals} onClick={() => filters.setOnlyDeals(!filters.onlyDeals)} floating={floating}>
        דילים חמים 🔥
        {filters.dealCount > 0 && !filters.onlyDeals && (
          <span className="rounded-full bg-espresso px-1.5 font-display text-[11px] font-bold text-white">
            {filters.dealCount}
          </span>
        )}
      </Chip>
      {onOpenFilters && !showTags && (
        <Chip active={filters.region !== 'all'} onClick={onOpenFilters} floating={floating}>
          {region.label} {region.emoji}
          <ChevronDown size={14} />
        </Chip>
      )}
      {showTags &&
        FILTER_TAG_ORDER.map((tag) => (
          <Chip key={tag} active={filters.activeTags.includes(tag)} onClick={() => filters.toggleTag(tag)} floating={floating}>
            {TAG_LABELS[tag].label} {TAG_LABELS[tag].emoji}
          </Chip>
        ))}
    </div>
  )
}
