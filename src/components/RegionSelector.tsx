import { REGION_OPTIONS, type RegionFilter } from '../data/regions'

interface RegionSelectorProps {
  value: RegionFilter
  onChange: (region: RegionFilter) => void
  /** Number of carts per region, shown as a small count */
  counts: Record<RegionFilter, number>
}

export default function RegionSelector({ value, onChange, counts }: RegionSelectorProps) {
  return (
    <div className="no-scrollbar overflow-x-auto border-b border-forest/10 bg-surface/80 backdrop-blur-md px-4 py-2 transition-colors">
      <div className="inline-flex min-w-full gap-1.5 rounded-2xl bg-oat/70 p-1 shadow-inner" role="radiogroup" aria-label="אזור">
        {REGION_OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                active
                  ? 'bg-surface font-extrabold text-forest shadow-sm ring-1 ring-black/5 scale-[1.01]'
                  : 'text-forest/70 hover:text-forest hover:bg-surface/50'
              }`}
            >
              <span>
                {opt.label} {opt.emoji}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.2 font-display text-[10px] font-extrabold ${
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
