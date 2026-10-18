import { useState } from 'react'
import { Heart, MapPin, Navigation, Sparkles } from 'lucide-react'
import type { CoffeeCart, FieldReport } from '../types/cart'
import { STATUS_META } from '../data/filters'
import { updatedLabel } from '../utils/time'
import { getWazeUrl } from '../utils/navigation'

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
    <div className="flex h-full flex-col overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-forest">
            <Sparkles size={24} className="text-espresso" />
            מהשטח עכשיו
          </h1>
          <p className="mt-0.5 text-xs text-ink/60">עדכונים, תמונות ואווירה חיה מעגלות הקפה בישראל</p>
        </div>
        <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-bold text-forest">
          {displayReports.length} עדכונים
        </span>
      </header>

      <div className="space-y-3.5">
        {displayReports.map((report) => {
          const cart = cartMap.get(report.cartId)
          const name = cart?.name ?? report.demoCartName ?? 'עגלת קפה'
          const area = cart?.area ?? report.demoArea ?? 'בישראל'
          const statusMeta = STATUS_META[report.status]
          const isLiked = likedReports[report.id]
          const likesCount = (report.likesCount ?? 0) + (isLiked ? 1 : 0)

          return (
            <article
              key={report.id}
              className="overflow-hidden rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-forest/10 transition hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onSelectCart(report.cartId)}
                    className="truncate text-start font-display text-base font-bold text-forest hover:underline"
                  >
                    {name}
                  </button>
                  <p className="flex items-center gap-1 text-xs text-ink/60">
                    <MapPin size={12} className="shrink-0" />
                    {area} · {updatedLabel(report.createdAt)}
                  </p>
                </div>

                <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${statusMeta.softBgClass} ${statusMeta.textClass}`}>
                  <span>{statusMeta.label}</span>
                  <span>·</span>
                  <span>{report.waitMinutes} דק׳</span>
                </div>
              </div>

              {/* Verified GPS pill */}
              {report.verifiedGps && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-calm/15 px-2 py-0.5 text-[11px] font-bold text-calm-ink">
                  📍 דיווח מאומת GPS מהשטח
                </div>
              )}

              {/* Note / Tip */}
              {report.note && (
                <p className="mt-2 text-sm text-ink/90 leading-relaxed bg-cream/50 rounded-xl p-2.5">
                  &ldquo;{report.note}&rdquo;
                </p>
              )}

              {/* Optional Photo */}
              {report.imageUrl && (
                <div className="mt-2.5 overflow-hidden rounded-xl border border-forest/10 max-h-48">
                  <img
                    src={report.imageUrl}
                    alt={`תמונה מ${name}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Tags */}
              {report.fieldTags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {report.fieldTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-oat px-2 py-0.5 text-[11px] font-medium text-forest"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer Actions */}
              <div className="mt-3 flex items-center justify-between border-t border-forest/5 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleLike(report.id)}
                  aria-label="לייק לעדכון"
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold transition active:scale-95 ${
                    isLiked ? 'bg-busy/15 text-busy' : 'text-ink/60 hover:bg-oat'
                  }`}
                >
                  <Heart size={15} className={isLiked ? 'fill-busy text-busy' : ''} />
                  <span>{likesCount > 0 ? likesCount : 'אהבתי'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCart(report.cartId)}
                    className="rounded-lg bg-surface px-2.5 py-1 font-bold text-forest ring-1 ring-forest/15 hover:bg-oat"
                  >
                    פרטי עגלה
                  </button>
                  {cart && (
                    <a
                      href={getWazeUrl(cart.coordinates)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-forest px-2.5 py-1 font-bold text-cream hover:bg-forest-light"
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
