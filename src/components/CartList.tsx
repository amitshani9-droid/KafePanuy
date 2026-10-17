import { useEffect, useRef } from 'react'
import type { CoffeeCart, LatLng } from '../types/cart'
import { distanceKm } from '../services/geo'
import CartCard from './CartCard'

interface CartListProps {
  carts: CoffeeCart[]
  /** User location; distances are hidden without it */
  origin: LatLng | null
  selectedId: string | null
  onSelect: (id: string) => void
  onReport: (id: string) => void
  onClearFilters: () => void
}

export default function CartList({ carts, origin, selectedId, onSelect, onReport, onClearFilters }: CartListProps) {
  const refs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    if (selectedId) refs.current.get(selectedId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedId])

  if (carts.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="text-5xl" aria-hidden="true">🫗</div>
        <h3 className="mt-3 font-display text-lg font-bold text-forest">אופס, לא מצאנו עגלה כזאת</h3>
        <p className="mt-1 text-sm text-ink/60">אולי ננסה עם פחות סינונים? יש עוד הרבה קפה טוב בסביבה.</p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 rounded-full bg-forest px-4 py-2 text-sm font-bold text-cream hover:bg-forest-light"
        >
          נקה סינונים
        </button>
      </div>
    )
  }

  return (
    <ul className="space-y-3 p-4">
      {carts.map((cart) => (
        <li key={cart.id}>
          <CartCard
            ref={(el) => {
              if (el) refs.current.set(cart.id, el)
              else refs.current.delete(cart.id)
            }}
            cart={cart}
            distanceKm={origin ? distanceKm(origin, cart.coordinates) : null}
            selected={cart.id === selectedId}
            onSelect={onSelect}
            onReport={onReport}
          />
        </li>
      ))}
    </ul>
  )
}
