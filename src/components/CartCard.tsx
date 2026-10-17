import { forwardRef } from 'react'
import { Clock, MapPin, Star } from 'lucide-react'
import type { CoffeeCart } from '../types/cart'
import { STATUS_META, TAG_LABELS } from '../data/filters'
import { formatDistance } from '../services/geo'
import { updatedLabel } from '../utils/time'
import ReportButton from './ReportButton'
import { isDealActive } from '../services/cartService'

interface CartCardProps {
  cart: CoffeeCart
  /** null when we don't know where the user is */
  distanceKm: number | null
  selected: boolean
  onSelect: (id: string) => void
  onReport?: (id: string) => void
  watching?: boolean
}

const CartCard = forwardRef<HTMLElement, CartCardProps>(function CartCard(
  { cart, distanceKm, selected, onSelect, onReport, watching = false },
  ref,
) {
  const status = STATUS_META[cart.status]
  const deal = isDealActive(cart) ? cart.flashDeal : undefined

  return (
    <article
      ref={ref}
      className={`overflow-hidden rounded-2xl bg-surface shadow-sm transition hover:shadow-md ${
        selected ? 'ring-2 ring-forest' : 'ring-1 ring-forest/10'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(cart.id)}
        aria-pressed={selected}
        className="block w-full p-4 pb-3 text-start"
      >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-forest">
            {cart.name}
            {watching && (
              <span className="ms-1.5 text-sm" role="img" aria-label="מחכים שיתפנה">
                🔔
              </span>
            )}
          </h3>
          <p className="flex items-center gap-1 truncate text-sm text-ink/60">
            <MapPin size={14} className="shrink-0" />
            {cart.area}
            {distanceKm !== null && ` · ${formatDistance(distanceKm)}`}
          </p>
        </div>

        <div className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 ${status.softBgClass}`}>
          <span className={`flex items-center gap-1 font-display text-lg font-bold leading-none ${status.textClass}`}>
            <Clock size={15} />
            {cart.waitMinutes}
          </span>
          <span className={`mt-0.5 text-[11px] font-bold ${status.textClass}`}>דק׳ · {status.label}</span>
        </div>
      </div>

      {deal && (
        <p className="deal-glow mt-2.5 flex items-center gap-2 rounded-xl bg-espresso/10 px-3 py-2 text-sm text-ink ring-1 ring-espresso/30">
          <span className="shrink-0 rounded-full bg-espresso px-2 py-0.5 text-xs font-bold text-white">🔥 דיל חם</span>
          <span className="truncate font-medium">{deal.text}</span>
        </p>
      )}

      <p className="mt-2 line-clamp-2 text-sm text-ink/80">{cart.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {cart.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-oat px-2 py-0.5 text-xs font-medium text-forest">
            {TAG_LABELS[tag].emoji} {TAG_LABELS[tag].short}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-forest/5 pt-2.5 text-xs text-ink/60">
        {cart.reviewCount > 0 ? (
          <span className="flex items-center gap-1">
            <Star size={14} className="fill-espresso text-espresso" />
            <span className="font-display font-bold text-ink">{cart.rating}</span>
            <span>({cart.reviewCount})</span>
          </span>
        ) : (
          <span className="rounded-full bg-calm/10 px-2 py-0.5 font-bold text-calm-ink">✨ חדש במפה</span>
        )}
        <span className="truncate">
          {cart.specialties[0]
            ? `☕ ${cart.specialties[0]}`
            : cart.source === 'osm'
              ? '🗺️ מ-OpenStreetMap'
              : cart.source === 'user'
                ? '🙋 נוסף ע״י משתמשים'
                : ''}
        </span>
        <span className="shrink-0">{updatedLabel(cart.lastUpdated)}</span>
      </div>
      </button>
      {onReport && (
        <div className="px-4 pb-3">
          <ReportButton onClick={() => onReport(cart.id)} />
        </div>
      )}
    </article>
  )
})

export default CartCard
