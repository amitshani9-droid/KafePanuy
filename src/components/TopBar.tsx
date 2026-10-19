import type { Filters } from '../lib/rank'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  calmCount: number
}

const KINDS: { value: Filters['kind']; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'cafe', label: 'בתי קפה' },
  { value: 'cart', label: 'עגלות' },
]

export function TopBar({ filters, onChange, calmCount }: Props) {
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold shadow-md ring-1 transition-colors ${
      active ? 'bg-ink text-surface ring-ink' : 'bg-surface text-ink ring-line hover:bg-hover'
    }`
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1100] pt-[max(env(safe-area-inset-top),0.75rem)]">
      <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto px-3 pb-2 md:px-4">
        <h1 className="me-1 shrink-0 rounded-full bg-ink px-3.5 py-2 font-display text-base leading-none text-surface shadow-md">
          קפה פנוי
        </h1>
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={filters.kind === k.value}
            onClick={() => onChange({ ...filters, kind: k.value })}
            className={chip(filters.kind === k.value)}
          >
            {k.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={filters.calmOnly}
          onClick={() => onChange({ ...filters, calmOnly: !filters.calmOnly })}
          className={`${chip(filters.calmOnly)} inline-flex items-center gap-1.5`}
        >
          <span className="size-2.5 rounded-full bg-calm" aria-hidden />
          רק פנויים{calmCount > 0 && <span className="tabular-nums opacity-70">({calmCount})</span>}
        </button>
      </div>
    </header>
  )
}
