import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, BarChart3, Bell, BellOff, Car, Clock, Coffee, MapPin, Navigation, Radio, Share2, Star, X } from 'lucide-react'
import type { CoffeeCart } from '../types/cart'
import type { SmartAlternative } from '../utils/recommendations'
import { STATUS_META, TAG_LABELS } from '../data/filters'
import { formatDistance } from '../services/geo'
import { updatedLabel } from '../utils/time'
import ReportButton from './ReportButton'
import HourlyForecastChart from './HourlyForecastChart'
import { isDealActive, RATING_POINTS } from '../services/cartService'
import { minutesUntil } from '../utils/time'
import { getGoogleMapsUrl, getWazeUrl } from '../utils/navigation'
import { getCartPhoto } from '../utils/cartImages'

interface CartDetailsDrawerProps {
  cart: CoffeeCart
  /** null when we don't know where the user is */
  distanceKm: number | null
  alternative: SmartAlternative | null
  onClose: () => void
  onGoToAlternative: (alt: SmartAlternative) => void
  onReport: () => void
  onShare: () => void
  /** This user's own rating, if any */
  myRating: number | undefined
  onRate: (stars: number) => void
  watching: boolean
  onToggleWatch: () => void
}

function RateCart({ myRating, onRate }: { myRating: number | undefined; onRate: (stars: number) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? myRating ?? 0
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-forest/10">
      <h3 className="text-sm font-bold text-forest">{myRating ? 'הדירוג שלך' : 'הייתם שם? דרגו את המקום'}</h3>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="דירוג בכוכבים" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={myRating === n}
            aria-label={`${n} כוכבים`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => onRate(n)}
            className="rounded-md p-0.5 transition active:scale-90"
          >
            <Star size={28} className={n <= shown ? 'fill-espresso text-espresso' : 'text-forest/25'} />
          </button>
        ))}
        {!myRating && <span className="ms-2 text-xs font-bold text-espresso">+{RATING_POINTS} נק׳</span>}
      </div>
    </section>
  )
}

function SmartAlternativeBanner({
  selected,
  alt,
  onGo,
}: {
  selected: CoffeeCart
  alt: SmartAlternative
  onGo: () => void
}) {
  return (
    <section
      aria-label="החלופה המומלצת"
      className="overflow-hidden rounded-2xl bg-gradient-to-bl from-calm to-calm-dark text-white shadow-lg shadow-calm/25"
    >
      <div className="p-4">
        <p className="font-display text-base font-bold leading-snug">
          חבל לעמוד בתור! מצאנו פינה שקטה {alt.driveMinutes} דק׳ מכאן 🌿
        </p>

        <div className="mt-3 rounded-xl bg-white/15 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold">{alt.cart.name}</div>
              <div className="flex items-center gap-1 truncate text-xs text-white/85">
                <MapPin size={12} className="shrink-0" />
                {alt.cart.area}
              </div>
            </div>
            {alt.cart.reviewCount > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-sm font-bold">
                <Star size={14} className="fill-white" />
                {alt.cart.rating}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/15 px-1 py-2">
              <div className="font-display text-lg font-bold leading-none">{alt.cart.waitMinutes} דק׳</div>
              <div className="mt-1 text-[11px] text-white/85">
                במקום <span className="line-through">{selected.waitMinutes}</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/15 px-1 py-2">
              <div className="font-display text-lg font-bold leading-none">{alt.driveMinutes} דק׳</div>
              <div className="mt-1 text-[11px] text-white/85">נסיעה · {alt.distanceKm.toFixed(1)} ק״מ</div>
            </div>
            <div className="rounded-lg bg-surface px-1 py-2 text-forest">
              <div className="font-display text-lg font-bold leading-none">{alt.timeSavedMinutes} דק׳</div>
              <div className="mt-1 text-[11px] font-medium">חוסכים</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onGo}
          className="mt-3 w-full rounded-xl bg-surface py-3 font-display text-base font-bold text-forest shadow-md transition hover:bg-cream active:scale-[0.98]"
        >
          עבור לחלופה הפנויה (חסוך {alt.timeSavedMinutes} דק׳) ⬅️
        </button>
      </div>
    </section>
  )
}

export default function CartDetailsDrawer({
  cart,
  distanceKm,
  alternative,
  onClose,
  onGoToAlternative,
  onReport,
  onShare,
  myRating,
  onRate,
  watching,
  onToggleWatch,
}: CartDetailsDrawerProps) {
  const status = STATUS_META[cart.status]
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true })
    scrollRef.current?.scrollTo({ top: 0 })
  }, [cart.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isLive = cart.dataSource === 'live'

  return (
    <aside
      key={cart.id}
      role="dialog"
      aria-label={`פרטים על ${cart.name}`}
      className="absolute inset-x-0 bottom-0 z-[1200] flex max-h-[85%] flex-col overflow-hidden rounded-t-[36px] bg-cream shadow-[0_-16px_50px_rgba(58,36,24,0.25)] animate-drawer-up md:inset-y-0 md:start-0 md:end-auto md:max-h-none md:w-[420px] md:rounded-none md:border-e md:border-forest/10 md:shadow-xl md:animate-drawer-side"
    >
      {/* Cover Image with gradient overlay and action buttons */}
      <div className="relative h-60 w-full shrink-0 overflow-hidden bg-oat">
        <img
          src={getCartPhoto(cart)}
          alt={cart.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/35 to-black/50 pointer-events-none" />

        {/* Grab handle (mobile) floating on image */}
        <div className="absolute top-2.5 inset-x-0 flex justify-center md:hidden" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-white/75 shadow-sm" />
        </div>

        {/* Floating Top Header Buttons */}
        <div className="absolute top-3.5 inset-x-4 flex items-center justify-between">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/45 backdrop-blur-md text-white shadow-sm hover:bg-black/65 active:scale-90 transition-all"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleWatch}
              aria-label={watching ? 'הפסק לעקוב' : 'קבל התראה כשיתפנה'}
              className={`flex h-9 w-9 items-center justify-center rounded-2xl backdrop-blur-md shadow-sm active:scale-90 transition-all ${
                watching ? 'bg-espresso text-white' : 'bg-black/45 text-white hover:bg-black/65'
              }`}
            >
              {watching ? <BellOff size={16} /> : <Bell size={16} />}
            </button>
            <button
              type="button"
              onClick={onShare}
              aria-label="שתף את העגלה"
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/45 backdrop-blur-md text-white shadow-sm hover:bg-black/65 active:scale-90 transition-all"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Bottom of hero photo: Cart Name & Area */}
        <div className="absolute bottom-2.5 inset-x-5">
          <h2 className="font-display text-3xl font-black text-forest drop-shadow-xs tracking-tight">{cart.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/80 font-medium">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-espresso" />
              <span>{cart.area}</span>
            </span>
            {distanceKm !== null && (
              <span className="rounded-full bg-surface/90 backdrop-blur-xs px-2.5 py-0.5 font-bold text-forest text-[11px] shadow-2xs">
                {formatDistance(distanceKm)} ממך
              </span>
            )}
            {cart.tags.includes('saturday') && (
              <span className="rounded-full bg-amber-500/90 backdrop-blur-xs px-2.5 py-0.5 font-extrabold text-white text-[11px] shadow-2xs">
                ☀️ פתוח בשבת
              </span>
            )}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-3 pb-5 touch-scroll">
        {/* Status + wait */}
        <div className="flex items-stretch gap-3">
          <div className={`flex flex-1 items-center gap-3.5 rounded-3xl p-3.5 shadow-sm ring-1 ring-black/5 ${status.softBgClass}`}>
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white shadow-sm ${status.bgClass}`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {status.label}
            </span>
            <span className={`flex items-baseline gap-1.5 ${status.textClass}`}>
              <span className="font-display text-3xl font-extrabold leading-none">{cart.waitMinutes}</span>
              <span className="text-xs font-extrabold">דק׳ המתנה</span>
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-3xl bg-surface px-4 py-2 ring-1 ring-forest/10 shadow-xs">
            {cart.reviewCount > 0 ? (
              <>
                <span className="flex items-center gap-1 font-display text-xl font-bold text-ink">
                  <Star size={16} className="fill-espresso text-espresso" />
                  {cart.rating}
                </span>
                <span className="text-[11px] text-ink/50">{cart.reviewCount} דירוגים</span>
              </>
            ) : (
              <>
                <span className="text-xl" aria-hidden="true">✨</span>
                <span className="text-[11px] font-bold text-calm-ink">חדש במפה</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-ink/60">
            <Clock size={13} />
            {updatedLabel(cart.lastUpdated)}
          </span>
          {cart.ownerVerified ? (
            <span className="flex items-center gap-1 rounded-full bg-calm/15 px-2.5 py-1 font-bold text-calm-ink">
              <BadgeCheck size={14} />
              עודכן רשמית ע״י בעל העגלה ✔️
            </span>
          ) : (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${
                isLive ? 'bg-forest text-cream' : 'bg-oat text-forest'
              }`}
            >
              {isLive ? <Radio size={13} /> : <BarChart3 size={13} />}
              {isLive ? 'דיווח חי מהשטח' : 'הערכה לפי שעות עומס'}
            </span>
          )}
          {cart.dataSource === 'live' && cart.verifiedGps && (
            <span className="flex items-center gap-1 rounded-full bg-calm/15 px-2.5 py-1 font-bold text-calm-ink">
              📍 אומת מהשטח
            </span>
          )}
        </div>

        {cart.flashDeal && isDealActive(cart) && (
          <div className="deal-glow rounded-2xl bg-gradient-to-bl from-espresso to-espresso-dark p-4 text-white">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/20 px-2 py-0.5">🔥 דיל חם</span>
              <span className="text-white/85">נגמר בעוד {minutesUntil(cart.flashDeal.expiresAt)} דק׳</span>
            </div>
            <p className="mt-2 font-display text-lg font-bold leading-snug">{cart.flashDeal.text}</p>
          </div>
        )}

        <ReportButton size="lg" onClick={onReport} />

        {(cart.status !== 'calm' || watching) && (
          <div>
            <button
              type="button"
              onClick={onToggleWatch}
              aria-pressed={watching}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                watching ? 'bg-forest text-cream' : 'bg-surface text-forest ring-1 ring-forest/20 hover:bg-oat'
              }`}
            >
              {watching ? <BellOff size={16} /> : <Bell size={16} />}
              {watching ? 'ביטול ההתראה' : 'תודיעו לי כשמתפנה 🔔'}
            </button>
            {watching && (
              <p className="mt-1.5 text-center text-xs text-ink/50">נודיע ברגע שמישהו ידווח שהתפנה (כשהאפליקציה פתוחה)</p>
            )}
          </div>
        )}

        {alternative && (
          <SmartAlternativeBanner selected={cart} alt={alternative} onGo={() => onGoToAlternative(alternative)} />
        )}

        {cart.fieldTags.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold text-forest">מה קורה שם עכשיו</h3>
            <div className="flex flex-wrap gap-2">
              {cart.fieldTags.map((tag) => (
                <span key={tag} className="rounded-full bg-surface px-3 py-1.5 text-sm text-ink shadow-sm ring-1 ring-forest/10">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {cart.latestTip && (
          <blockquote className="rounded-2xl border-s-4 border-espresso bg-surface px-4 py-3 text-sm text-ink shadow-sm">
            <span className="mb-0.5 block text-xs font-bold text-espresso">💬 טיפ מהשטח</span>
            {cart.latestTip}
          </blockquote>
        )}

        <p className="text-sm leading-relaxed text-ink/80">{cart.description}</p>

        <RateCart myRating={myRating} onRate={onRate} />

        <HourlyForecastChart cart={cart} />

        {cart.specialties.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold text-forest">מה מומלץ להזמין</h3>
            <ul className="divide-y divide-forest/5 rounded-2xl bg-surface ring-1 ring-forest/10">
              {cart.specialties.map((item) => (
                <li key={item} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <Coffee size={15} className="shrink-0 text-espresso" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-wrap gap-1.5">
          {cart.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-oat px-2.5 py-1 text-xs font-medium text-forest">
              {TAG_LABELS[tag].emoji} {TAG_LABELS[tag].short}
            </span>
          ))}
        </section>

        <p className="flex items-center gap-1.5 text-sm text-ink/70">
          <Clock size={15} className="text-forest" />
          {cart.openingHours}
        </p>

        {cart.source !== 'curated' && (
          <p className="text-xs text-ink/50">
            {cart.source === 'osm' ? (
              <>
                מקור:{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-forest"
                >
                  © תורמי OpenStreetMap
                </a>
              </>
            ) : (
              'נוסף ע״י משתמשי קפה פנוי'
            )}
          </p>
        )}
      </div>

      {/* Actions */}
      <footer className="grid grid-cols-2 gap-2.5 border-t border-forest/10 bg-cream/95 backdrop-blur-xl px-5 py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href={getWazeUrl(cart.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-forest to-forest-light py-3.5 text-sm font-bold text-cream shadow-md shadow-forest/20 transition hover:brightness-105 active:scale-[0.97]"
        >
          <Navigation size={16} />
          ניווט ב-Waze
        </a>
        <a
          href={getGoogleMapsUrl(cart.coordinates, cart.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 text-sm font-bold text-forest ring-1 ring-forest/20 shadow-xs transition hover:bg-oat active:scale-[0.97]"
        >
          <Car size={16} />
          Google Maps
        </a>
      </footer>
    </aside>
  )
}
