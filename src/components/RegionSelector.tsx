import { REGION_OPTIONS, type RegionFilter } from '../data/regions'

interface RegionSelectorProps {
  value: RegionFilter
  onChange: (region: RegionFilter) => void
  /** Number of carts per region, shown as a small count */
  counts: Record<RegionFilter, number>
}

export default function RegionSelector({ value, onChange, counts }: RegionSelectorProps) {
  return (
    <div className="no-scrollbar overflow-x-auto border-b border-forest/10 bg-cream px-4 py-2">
      <div className="inline-flex min-w-full gap-1 rounded-2xl bg-oat p-1" role="radiogroup" aria-label="אזור">
        {REGION_OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                active ? 'bg-white font-bold text-forest shadow-sm' : 'text-forest/70 hover:text-forest'
              }`}
            >
              <span>
                {opt.label} {opt.emoji}
              </span>
              <span
                className={`rounded-full px-1.5 font-display text-[11px] ${
                  active ? 'bg-forest text-cream' : 'bg-forest/10 text-forest/70'
                }`}
              >
                {counts[opt.value]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
