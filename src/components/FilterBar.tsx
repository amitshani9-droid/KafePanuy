import type { ReactNode } from 'react'
import { ArrowUpDown, Search, X } from 'lucide-react'
import type { FilterTag, SortOption } from '../types/cart'
import { FILTER_TAG_ORDER, SORT_LABELS, TAG_LABELS } from '../data/filters'

interface FilterBarProps {
  query: string
  onQueryChange: (q: string) => void
  onlyFree: boolean
  onToggleOnlyFree: () => void
  onlyDeals: boolean
  onToggleOnlyDeals: () => void
  activeTags: FilterTag[]
  onToggleTag: (tag: FilterTag) => void
  sort: SortOption
  onSortChange: (s: SortOption) => void
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition active:scale-95 ${
        active ? 'bg-forest text-cream shadow-sm' : 'bg-surface text-forest ring-1 ring-forest/15 hover:bg-oat'
      }`}
    >
      {children}
    </button>
  )
}

export default function FilterBar({
  query,
  onQueryChange,
  onlyFree,
  onToggleOnlyFree,
  onlyDeals,
  onToggleOnlyDeals,
  activeTags,
  onToggleTag,
  sort,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="z-10 space-y-2.5 border-b border-forest/10 bg-cream px-4 py-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">חיפוש עגלה</span>
          <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-forest/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="איפה בא לך קפה הבוקר?..."
            className="w-full rounded-2xl border-0 bg-surface py-2.5 ps-10 pe-9 text-base text-ink shadow-sm ring-1 ring-forest/10 placeholder:text-ink/40 focus:ring-2 focus:ring-forest focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="נקה חיפוש"
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-forest/50 hover:bg-oat"
            >
              <X size={16} />
            </button>
          )}
        </label>

        <label className="relative flex items-center">
          <span className="sr-only">מיון</span>
          <ArrowUpDown size={16} className="pointer-events-none absolute start-3 text-forest/60" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="h-full cursor-pointer appearance-none rounded-2xl border-0 bg-surface py-2.5 ps-9 pe-4 text-sm font-medium text-forest shadow-sm ring-1 ring-forest/10 focus:ring-2 focus:ring-forest focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        <Chip active={onlyFree} onClick={onToggleOnlyFree}>
          רק פנוי עכשיו 🟢
        </Chip>
        <Chip active={onlyDeals} onClick={onToggleOnlyDeals}>
          דילים חמים 🔥
        </Chip>
        {FILTER_TAG_ORDER.map((tag) => (
          <Chip key={tag} active={activeTags.includes(tag)} onClick={() => onToggleTag(tag)}>
            {TAG_LABELS[tag].label} {TAG_LABELS[tag].emoji}
          </Chip>
        ))}
      </div>
    </div>
  )
}
