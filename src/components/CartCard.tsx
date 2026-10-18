import { forwardRef } from 'react'
import { Clock, MapPin, Navigation, Star } from 'lucide-react'
import type { CoffeeCart } from '../types/cart'
import { STATUS_META, TAG_LABELS } from '../data/filters'
import { formatDistance } from '../services/geo'
import { updatedLabel } from '../utils/time'
import { getWazeUrl } from '../utils/navigation'
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
      className={`overflow-hidden rounded-3xl bg-surface shadow-[0_4px_20px_rgba(27,67,50,0.06)] transition-all duration-200 hover:shadow-[0_8px_30px_rgba(27,67,50,0.12)] ${
        selected ? 'ring-2 ring-forest shadow-md' : 'ring-1 ring-forest/10'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(cart.id)}
        aria-pressed={selected}
        className="block w-full p-4 pb-3 text-start active:scale-[0.99] transition-transform"
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
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink/65">
              <MapPin size={13} className="shrink-0 text-forest/70" />
              <span>{cart.area}</span>
              {distanceKm !== null && (
                <span className="rounded-full bg-oat px-2 py-0.5 font-bold text-forest">
                  {formatDistance(distanceKm)}
                </span>
              )}
            </p>
          </div>

          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-1.5 shadow-xs ring-1 ring-black/5 ${status.softBgClass}`}
          >
            <span className={`flex items-center gap-1 font-display text-lg font-bold leading-none ${status.textClass}`}>
              <Clock size={15} />
              {cart.waitMinutes}
            </span>
            <span className={`mt-0.5 text-[10.5px] font-bold ${status.textClass}`}>דק׳ · {status.label}</span>
          </div>
        </div>

        {deal && (
          <p className="deal-glow mt-3 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-espresso/15 to-espresso/5 px-3 py-2 text-xs text-ink ring-1 ring-espresso/30">
            <span className="shrink-0 rounded-full bg-gradient-to-r from-espresso to-espresso-dark px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              🔥 דיל חם
            </span>
            <span className="truncate font-bold">{deal.text}</span>
          </p>
        )}

        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-ink/75">{cart.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {cart.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-oat/80 px-2.5 py-0.5 text-[11px] font-medium text-forest ring-1 ring-forest/5"
            >
              {TAG_LABELS[tag].emoji} {TAG_LABELS[tag].short}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-forest/5 pt-2.5 text-[11px] text-ink/60">
          {cart.reviewCount > 0 ? (
            <span className="flex items-center gap-1">
              <Star size={13} className="fill-espresso text-espresso" />
              <span className="font-display font-bold text-ink">{cart.rating}</span>
              <span className="text-ink/40">({cart.reviewCount})</span>
            </span>
          ) : (
            <span className="rounded-full bg-calm/10 px-2 py-0.5 font-bold text-calm-ink">✨ חדש במפה</span>
          )}
          <span className="truncate text-ink/70">
            {cart.specialties[0]
              ? `☕ ${cart.specialties[0]}`
              : cart.source === 'osm'
                ? '🗺️ מ-OpenStreetMap'
                : cart.source === 'user'
                  ? '🙋 נוסף ע״י משתמשים'
                  : ''}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {cart.dataSource === 'live' && cart.verifiedGps && (
              <span className="rounded-full bg-calm/15 px-2 py-0.5 font-bold text-calm-ink ring-1 ring-calm/30">
                📍 מאומת
              </span>
            )}
            <span>{updatedLabel(cart.lastUpdated)}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 px-4 pb-3.5 pt-1">
        {onReport && (
          <div className="flex-1">
            <ReportButton onClick={() => onReport(cart.id)} />
          </div>
        )}
        <a
          href={getWazeUrl(cart.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-forest/10 px-3.5 py-2.5 text-xs font-bold text-forest ring-1 ring-forest/15 transition hover:bg-forest/20 active:scale-95 shadow-xs"
          title="ניווט ב-Waze"
        >
          <Navigation size={14} className="text-forest" />
          <span>Waze</span>
        </a>
      </div>
    </article>
  )
})

export default CartCard
