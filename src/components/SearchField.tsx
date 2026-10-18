import { Search, X } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Elevated pill for floating over the map */
  floating?: boolean
}

export default function SearchField({ value, onChange, floating = false }: SearchFieldProps) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">חיפוש עגלה</span>
      <Search
        size={18}
        className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-forest/60 transition-colors"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="איפה בא לך קפה?"
        enterKeyHint="search"
        className={`w-full border-0 py-3 ps-10 pe-9 text-base text-ink placeholder:text-ink/40 transition-all focus:ring-2 focus:ring-forest focus:outline-none [&::-webkit-search-cancel-button]:hidden ${
          floating
            ? 'rounded-full bg-surface/92 backdrop-blur-xl shadow-[0_8px_30px_rgba(58,36,24,0.12)] ring-1 ring-forest/15 focus:bg-surface'
            : 'rounded-2xl bg-surface/95 shadow-sm ring-1 ring-forest/10 focus:ring-forest/30'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="נקה חיפוש"
          className="absolute end-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-ink/70 transition hover:bg-ink/20 active:scale-90"
        >
          <X size={14} />
        </button>
      )}
    </label>
  )
}
