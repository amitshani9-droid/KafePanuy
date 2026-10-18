import { forwardRef } from 'react'
import { MapPin, Navigation, Star } from 'lucide-react'
import type { CoffeeCart } from '../types/cart'
import { STATUS_META, TAG_LABELS } from '../data/filters'
import { formatDistance } from '../services/geo'
import { updatedLabel } from '../utils/time'
import { getWazeUrl } from '../utils/navigation'
import { getCartPhoto } from '../utils/cartImages'
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
  const photoUrl = getCartPhoto(cart)

  return (
    <article
      ref={ref}
      className={`group overflow-hidden rounded-3xl bg-surface shadow-[0_6px_24px_rgba(58,36,24,0.07)] transition-all duration-300 hover:shadow-[0_12px_36px_rgba(58,36,24,0.14)] ${
        selected ? 'ring-2 ring-forest shadow-lg' : 'ring-1 ring-forest/10 hover:-translate-y-0.5'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(cart.id)}
        aria-pressed={selected}
        className="block w-full text-start active:scale-[0.99] transition-transform"
      >
        {/* Cover Photo */}
        <div className="relative h-44 w-full overflow-hidden bg-oat">
          <img
            src={photoUrl}
            alt={cart.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between">
            {/* Distance badge */}
            {distanceKm !== null ? (
              <span className="flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                <MapPin size={11} className="text-espresso" />
                {formatDistance(distanceKm)}
              </span>
            ) : (
              <span />
            )}

            {/* Wait status pill */}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white shadow-md backdrop-blur-md ${status.bgClass}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <span>{cart.waitMinutes} דק׳</span>
              <span className="opacity-80">· {status.label}</span>
            </span>
          </div>

          {/* Bottom Photo Overlay — Flash Deal or Verified */}
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-xs">
            {deal ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-espresso to-espresso-dark px-2.5 py-1 text-xs font-bold text-white shadow-md">
                <span>🔥</span>
                <span className="truncate max-w-[200px]">{deal.text}</span>
              </span>
            ) : cart.dataSource === 'live' && cart.verifiedGps ? (
              <span className="flex items-center gap-1 rounded-full bg-calm/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                📍 מאומת מהשטח
              </span>
            ) : (
              <span />
            )}

            {cart.reviewCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-white">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <span>{cart.rating}</span>
                <span className="text-white/70">({cart.reviewCount})</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-2xl font-black text-forest tracking-tight">
                {cart.name}
                {watching && (
                  <span className="ms-1.5 text-sm" role="img" aria-label="מחכים שיתפנה">
                    🔔
                  </span>
                )}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink/65">
                <MapPin size={12} className="shrink-0 text-forest/70" />
                <span>{cart.area}</span>
              </p>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/75 font-normal">
            {cart.description}
          </p>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cart.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-oat/90 px-2.5 py-0.5 text-[11px] font-semibold text-forest/90 ring-1 ring-forest/5"
              >
                {TAG_LABELS[tag].emoji} {TAG_LABELS[tag].short}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-forest/5 pt-2 text-[11px] text-ink/50">
            <span className="truncate">
              {cart.specialties[0]
                ? `☕ מומלץ: ${cart.specialties[0]}`
                : cart.source === 'osm'
                  ? '🗺️ מ-OpenStreetMap'
                  : 'קפה איכותי ומאפים'}
            </span>
            <span>{updatedLabel(cart.lastUpdated)}</span>
          </div>
        </div>
      </button>

      {/* Footer Navigation & Report */}
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
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-forest/10 px-4 py-2.5 text-xs font-bold text-forest ring-1 ring-forest/15 transition hover:bg-forest/20 active:scale-95 shadow-xs"
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

