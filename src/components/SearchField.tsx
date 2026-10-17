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
      <Search size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-forest/50" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="איפה בא לך קפה?"
        enterKeyHint="search"
        className={`w-full border-0 bg-surface py-3 ps-10 pe-9 text-base text-ink placeholder:text-ink/45 focus:ring-2 focus:ring-forest focus:outline-none [&::-webkit-search-cancel-button]:hidden ${
          floating ? 'rounded-full shadow-lg ring-1 ring-forest/10' : 'rounded-2xl shadow-sm ring-1 ring-forest/10'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="נקה חיפוש"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-forest/50 hover:bg-oat"
        >
          <X size={16} />
        </button>
      )}
    </label>
  )
}
