import { useState } from 'react'
import { Heart, MapPin, Navigation, Sparkles } from 'lucide-react'
import type { CoffeeCart, FieldReport } from '../types/cart'
import { STATUS_META } from '../data/filters'
import { updatedLabel } from '../utils/time'
import { getWazeUrl } from '../utils/navigation'
import { getCartPhoto } from '../utils/cartImages'

interface CommunityFeedProps {
  reports: FieldReport[]
  carts: CoffeeCart[]
  onSelectCart: (cartId: string) => void
  onLikeReport?: (reportId: string) => void
  onOpenReportModal?: (cartId: string) => void
}

export default function CommunityFeed({
  reports,
  carts,
  onSelectCart,
  onLikeReport,
}: CommunityFeedProps) {
  const [likedReports, setLikedReports] = useState<Record<string, boolean>>({})

  const cartMap = new Map<string, CoffeeCart>(carts.map((c) => [c.id, c]))

  function handleLike(reportId: string) {
    if (likedReports[reportId]) return
    setLikedReports((prev) => ({ ...prev, [reportId]: true }))
    onLikeReport?.(reportId)
  }

  // Fallback demo reports if none submitted yet
  const displayReports: (FieldReport & { demoCartName?: string; demoArea?: string })[] =
    reports.length > 0
      ? reports
      : carts.slice(0, 8).map((c, i) => ({
          id: `demo-${c.id}`,
          cartId: c.id,
          status: c.status,
          waitMinutes: c.waitMinutes,
          fieldTags: c.fieldTags.length > 0 ? c.fieldTags : ['מאפים חמים מהתנור 🥐', 'מלא מקום בצל 🌳'],
          note: c.latestTip || 'הגענו והאווירה נהדרת, קפה מעולה!',
          pointsEarned: 40,
          verifiedGps: i % 2 === 0,
          likesCount: 3 + (i * 2),
          createdAt: c.lastUpdated,
          demoCartName: c.name,
          demoArea: c.area,
        }))

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-24 touch-scroll">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-forest">
            <Sparkles size={24} className="text-espresso animate-pulse" />
            מהשטח עכשיו
          </h1>
          <p className="mt-0.5 text-xs text-ink/65">עדכונים, תמונות ואווירה חיה מעגלות הקפה בישראל</p>
        </div>
        <span className="rounded-full bg-forest/10 px-3 py-1 font-display text-xs font-bold text-forest ring-1 ring-forest/15">
          {displayReports.length} עדכונים
        </span>
      </header>

      {/* Editorial community hero banner */}
      <div className="relative mb-5 overflow-hidden rounded-3xl p-4 shadow-[0_12px_32px_rgba(58,36,24,0.18)] ring-1 ring-forest/15">
        <img
          src="/images/hero.jpg"
          alt="עגלת קפה בטבע"
          className="absolute inset-0 h-full w-full object-cover object-center filter brightness-[0.45] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/60 to-transparent" />
        <div className="relative z-10 flex items-center justify-between gap-3 text-cream">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-md ring-1 ring-white/20">
              ☕
            </span>
            <div>
              <p className="font-display text-base font-bold text-white drop-shadow-sm">נמצאים בעגלת קפה עכשיו?</p>
              <p className="text-xs text-cream/90">שתפו תמונת מצב מהשטח וקבלו עד +70 נקודות!</p>
            </div>
          </div>
          {carts.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectCart(carts[0].id)}
              className="shrink-0 rounded-2xl bg-surface px-3.5 py-2 text-xs font-bold text-forest shadow-md transition hover:bg-cream active:scale-95"
            >
              דווח עכשיו
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {displayReports.map((report, idx) => {
          const cart = cartMap.get(report.cartId)
          const name = cart?.name ?? report.demoCartName ?? 'עגלת קפה'
          const area = cart?.area ?? report.demoArea ?? 'בישראל'
          const statusMeta = STATUS_META[report.status]
          const isLiked = likedReports[report.id]
          const likesCount = (report.likesCount ?? 0) + (isLiked ? 1 : 0)
          const avatarEmojis = ['☕', '🥐', '✨', '🌿', '🍪', '🥤']
          const avatarEmoji = avatarEmojis[idx % avatarEmojis.length]

          return (
            <article
              key={report.id}
              className="overflow-hidden rounded-3xl bg-surface p-4 shadow-[0_4px_20px_rgba(58,36,24,0.06)] ring-1 ring-forest/10 transition-all duration-200 hover:shadow-[0_8px_30px_rgba(58,36,24,0.12)]"
            >
              {/* Header with Avatar */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-oat/90 text-lg shadow-inner ring-1 ring-forest/10">
                    {avatarEmoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectCart(report.cartId)}
                      className="truncate text-start font-display text-base font-bold text-forest hover:underline block w-full"
                    >
                      {name}
                    </button>
                    <p className="flex items-center gap-1 text-[11px] text-ink/60 truncate">
                      <MapPin size={11} className="shrink-0 text-forest/70" />
                      <span>{area}</span>
                      <span>·</span>
                      <span>{updatedLabel(report.createdAt)}</span>
                    </p>
                  </div>
                </div>

                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs font-bold shadow-xs ring-1 ring-black/5 ${statusMeta.softBgClass} ${statusMeta.textClass}`}
                >
                  <span>{statusMeta.label}</span>
                  <span>·</span>
                  <span>{report.waitMinutes} דק׳</span>
                </div>
              </div>

              {/* Verified GPS pill */}
              {report.verifiedGps && (
                <div className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-calm/15 px-2.5 py-0.5 text-[10.5px] font-bold text-calm-ink ring-1 ring-calm/30">
                  📍 דיווח מאומת מהשטח (+בונוס GPS)
                </div>
              )}

              {/* Note / Tip bubble */}
              {report.note && (
                <div className="mt-2.5 rounded-2xl bg-oat/40 p-3 text-xs leading-relaxed text-ink/85 border border-forest/5">
                  &ldquo;{report.note}&rdquo;
                </div>
              )}

              {/* Photo */}
              {(() => {
                const photo = report.imageUrl || (cart ? getCartPhoto(cart) : null)
                return photo ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-forest/10 shadow-inner h-44 w-full bg-oat">
                    <img
                      src={photo}
                      alt={`תמונה מ${name}`}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : null
              })()}

              {/* Tags */}
              {report.fieldTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {report.fieldTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-oat px-2.5 py-0.5 text-[11px] font-medium text-forest ring-1 ring-forest/5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-3.5 flex items-center justify-between border-t border-forest/5 pt-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleLike(report.id)}
                  aria-label="לייק לעדכון"
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold transition-all duration-150 active:scale-90 ${
                    isLiked
                      ? 'bg-busy/15 text-busy ring-1 ring-busy/30'
                      : 'text-ink/65 hover:bg-oat active:bg-oat'
                  }`}
                >
                  <Heart size={15} className={isLiked ? 'fill-busy text-busy scale-110' : ''} />
                  <span>{likesCount > 0 ? likesCount : 'אהבתי'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCart(report.cartId)}
                    className="rounded-xl bg-surface px-3 py-1.5 font-bold text-forest ring-1 ring-forest/15 hover:bg-oat active:scale-95 transition"
                  >
                    פרטים במפה
                  </button>
                  {cart && (
                    <a
                      href={getWazeUrl(cart.coordinates)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-xl bg-forest/10 px-3 py-1.5 font-bold text-forest ring-1 ring-forest/15 hover:bg-forest/20 active:scale-95 transition"
                    >
                      <Navigation size={12} />
                      Waze
                    </a>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
