import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { SortOption } from '../types/cart'
import { FILTER_TAG_ORDER, SORT_LABELS, TAG_LABELS } from '../data/filters'
import { REGION_OPTIONS, type RegionFilter } from '../data/regions'
import type { CartFilters } from '../hooks/useCartFilters'
import Modal from './Modal'

interface FiltersSheetProps {
  filters: CartFilters
  onRegionChange: (region: RegionFilter) => void
  onSortChange: (sort: SortOption) => void
  onClose: () => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-forest">{title}</h3>
      {children}
    </section>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
        active ? 'bg-forest text-cream shadow-sm' : 'bg-surface text-ink ring-1 ring-forest/15 hover:bg-oat'
      }`}
    >
      {children}
    </button>
  )
}

/** Everything that narrows the map & list, in one sheet (phones) / dialog (desktop). */
export default function FiltersSheet({ filters, onRegionChange, onSortChange, onClose }: FiltersSheetProps) {
  const n = filters.visibleCarts.length
  return (
    <Modal
      onClose={onClose}
      title="סינון ומיון"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              filters.clearFilters()
              onRegionChange('all')
            }}
            className="rounded-xl px-4 py-3 text-sm font-bold text-forest hover:bg-oat"
          >
            נקה הכל
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-forest py-3 font-display font-bold text-cream transition hover:bg-forest-light active:scale-[0.98]"
          >
            {n === 0 ? 'אין עגלות שמתאימות' : n === 1 ? 'הצג עגלה אחת' : `הצג ${n} עגלות`}
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-2">
        <Section title="מה עכשיו">
          <div className="flex flex-wrap gap-2">
            <Toggle active={filters.onlyFree} onClick={() => filters.setOnlyFree(!filters.onlyFree)}>
              רק פנוי עכשיו 🟢
            </Toggle>
            <Toggle active={filters.onlyDeals} onClick={() => filters.setOnlyDeals(!filters.onlyDeals)}>
              דילים חמים 🔥
            </Toggle>
          </div>
        </Section>

        <Section title="אזור">
          <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="אזור">
            {REGION_OPTIONS.map((opt) => {
              const active = filters.region === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onRegionChange(opt.value)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-start transition ${
                    active ? 'bg-forest/10 ring-2 ring-forest' : 'bg-surface ring-1 ring-forest/10 hover:bg-oat'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {opt.emoji}
                  </span>
                  <span className="flex-1 font-medium text-ink">{opt.label}</span>
                  <span className="rounded-full bg-oat px-2 font-display text-xs text-forest">
                    {filters.regionCounts[opt.value]}
                  </span>
                  {active && <Check size={18} className="text-forest" />}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="מיון">
          <div className="flex rounded-xl bg-oat p-1" role="radiogroup" aria-label="מיון">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={filters.sort === s}
                onClick={() => onSortChange(s)}
                className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                  filters.sort === s ? 'bg-surface text-forest shadow-sm' : 'text-forest/60'
                }`}
              >
                {SORT_LABELS[s]}
              </button>
            ))}
          </div>
        </Section>

        <Section title="מה חשוב לך">
          <div className="flex flex-wrap gap-2">
            {FILTER_TAG_ORDER.map((tag) => (
              <Toggle key={tag} active={filters.activeTags.includes(tag)} onClick={() => filters.toggleTag(tag)}>
                {TAG_LABELS[tag].emoji} {TAG_LABELS[tag].label}
              </Toggle>
            ))}
          </div>
        </Section>
      </div>
    </Modal>
  )
}
