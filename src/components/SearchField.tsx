import { Search, X } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Elevated pill for floating over the map */
  floating?: boolean
}

export default function SearchField({ value, onChange, floating = false }: SearchFieldProps) {
  return (
    <label className="relative block min-w-0 flex-1 group">
      <span className="sr-only">חיפוש עגלה</span>
      <Search
        size={17}
        className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-forest/50 transition-colors group-focus-within:text-espresso"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="איפה בא לך קפה? (שם, יישוב, אזור...)"
        enterKeyHint="search"
        className={`w-full border-0 py-2.5 ps-10 pe-9 text-sm font-medium text-ink placeholder:text-ink/40 transition-all focus:outline-none [&::-webkit-search-cancel-button]:hidden ${
          floating
            ? 'rounded-full bg-surface/92 backdrop-blur-xl shadow-[0_8px_30px_rgba(58,36,24,0.12)] ring-1 ring-forest/15 focus:bg-surface'
            : 'rounded-2xl bg-surface shadow-2xs ring-1 ring-forest/12 focus:ring-2 focus:ring-forest/25'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="נקה חיפוש"
          className="absolute end-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/10 text-ink/70 transition hover:bg-ink/20 active:scale-90"
        >
          <X size={13} />
        </button>
      )}
    </label>
  )
}
