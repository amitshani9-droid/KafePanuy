import { useMemo, useState } from 'react'
import { ArrowRight, Check, Loader2, MapPin, Navigation, X } from 'lucide-react'
import type { LearnedProfile, Level } from '../types'
import type { RankedPlace } from '../lib/rank'
import { dayForecast, describeSource, LEVEL_LABEL, quietestHour } from '../lib/busyness'
import { describeOpenState, getSchedule, openState } from '../lib/hours'
import { distanceKm, formatDistance, walkMinutes } from '../lib/geo'
import { googleMapsUrl, osmEditUrl, wazeUrl } from '../lib/links'
import { BackendError } from '../lib/backend'
import { HourChart } from './HourChart'
import { LEVEL_TEXT } from './StatusTag'

interface Props {
  item: RankedPlace
  profile?: LearnedProfile
  alternative: RankedPlace | null
  now: Date
  onClose: () => void
  onSelect: (key: string) => void
  onReport: (key: string, level: Level) => Promise<void>
}

const REPORT_OPTIONS: { level: Level; label: string; hint: string }[] = [
  { level: 'calm', label: 'אין תור', hint: 'נכנסים ומזמינים' },
  { level: 'moderate', label: 'קצת תור', hint: 'כמה אנשים' },
  { level: 'busy', label: 'תור ארוך', hint: 'מחכים הרבה' },
]

const REPORT_STYLE: Record<Level, string> = {
  calm: 'border-calm text-calm-ink',
  moderate: 'border-moderate text-moderate-ink',
  busy: 'border-busy text-busy-ink',
}
const REPORT_ACTIVE: Record<Level, string> = {
  calm: 'bg-calm border-calm text-white',
  moderate: 'bg-moderate border-moderate text-white',
  busy: 'bg-busy border-busy text-white',
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export function PlaceDetail({ item, profile, alternative, now, onClose, onSelect, onReport }: Props) {
  const { place, status, km } = item
  const [dayOffset, setDayOffset] = useState(0)
  const [sent, setSent] = useState<Level | null>(null)
  const [sending, setSending] = useState<Level | null>(null)
  const [error, setError] = useState<string | null>(null)

  const schedule = getSchedule(place)
  const open = openState(schedule, now)

  const day = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(0, 0, 0, 0)
    return d
  }, [now, dayOffset])
  const forecast = useMemo(() => dayForecast(place, day, profile), [place, day, profile])
  const quiet = dayOffset === 0 ? quietestHour(forecast, now) : quietestHour(forecast, day)
  const learnedHours = forecast.filter((f) => f.learned).length

  async function report(level: Level) {
    setSending(level)
    setError(null)
    try {
      await onReport(place.key, level)
      setSent(level)
    } catch (e) {
      const kind = e instanceof BackendError ? e.kind : 'network'
      setError(
        kind === 'rate-limited'
          ? 'דיווחת הרבה בשעה האחרונה. נסו שוב עוד מעט.'
          : 'הדיווח לא נשלח — בדקו את החיבור ונסו שוב.',
      )
    } finally {
      setSending(null)
    }
  }

  const bigLabel = status.level ? LEVEL_LABEL[status.level] : 'סגור'
  const bigColor = LEVEL_TEXT[status.level ?? 'closed']

  return (
    <article className="animate-rise px-4 pb-6" aria-labelledby="place-title">
      {/* Header */}
      <div className="flex items-start gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {place.kind === 'cart' ? 'עגלת קפה' : 'בית קפה'}
            {km != null && ` · ${formatDistance(km)}`}
          </p>
          <h2 id="place-title" className="text-xl leading-tight font-bold">
            {place.name}
          </h2>
          {place.address && <p className="mt-0.5 truncate text-sm text-muted">{place.address}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-page text-muted hover:text-ink"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Now */}
      <section className="mt-4" aria-label="מצב עכשיו">
        <p className={`font-display text-6xl leading-none ${bigColor}`}>{bigLabel}</p>
        <p className="mt-2 text-sm text-muted">
          {status.source === 'closed' ? describeOpenState(open, now) : describeSource(status)}
          {status.source !== 'closed' && open.open && (
            <>
              {' · '}
              {describeOpenState(open, now)}
            </>
          )}
          {!open.known && ' (שעות משוערות)'}
        </p>

        {alternative && (
          <button
            type="button"
            onClick={() => onSelect(alternative.place.key)}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-calm/40 bg-calm/10 px-3 py-2.5 text-start"
          >
            <MapPin className="size-5 shrink-0 text-calm-ink" aria-hidden />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">{alternative.place.name} פנוי עכשיו</span>
              <span className="block text-muted">
                {walkMinutes(distanceKm(place, alternative.place))} דק׳ הליכה מכאן
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 rotate-180 text-muted" aria-hidden />
          </button>
        )}
      </section>

      {/* Report */}
      <section className="mt-6" aria-labelledby="report-title">
        <h3 id="report-title" className="font-semibold">
          {sent ? 'תודה! עכשיו כולם יודעים' : 'אתם שם? מה המצב בתור?'}
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {REPORT_OPTIONS.map((o) => {
            const active = sent === o.level
            return (
              <button
                key={o.level}
                type="button"
                disabled={sending != null}
                onClick={() => report(o.level)}
                aria-pressed={active}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 transition-colors disabled:opacity-60 ${
                  active ? REPORT_ACTIVE[o.level] : `bg-surface ${REPORT_STYLE[o.level]}`
                }`}
              >
                <span className="flex items-center gap-1 font-bold">
                  {sending === o.level && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {active && <Check className="size-4" aria-hidden />}
                  {o.label}
                </span>
                <span className={`text-xs ${active ? 'text-white/85' : 'text-muted'}`}>{o.hint}</span>
              </button>
            )
          })}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-busy-ink">
            {error}
          </p>
        )}
      </section>

      {/* When is it quiet */}
      <section className="mt-6" aria-labelledby="forecast-title">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="forecast-title" className="font-semibold">
            מתי פנוי?
          </h3>
          {quiet && (
            <p className="text-sm">
              {dayOffset === 0 ? 'הכי שקט היום ב-' : 'הכי שקט ב-'}
              <span className="font-bold tabular-nums">{quiet.hour}:00</span>
            </p>
          )}
        </div>
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1" role="tablist" aria-label="בחירת יום">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now)
            d.setDate(d.getDate() + i)
            const label = i === 0 ? 'היום' : i === 1 ? 'מחר' : DAY_NAMES[d.getDay()]
            const active = i === dayOffset
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDayOffset(i)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                  active ? 'bg-ink text-surface' : 'bg-page text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <HourChart
            forecast={forecast}
            currentHour={dayOffset === 0 ? now.getHours() : null}
            quietHour={quiet?.hour ?? null}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {learnedHours > 0
            ? `${learnedHours} מהשעות מבוססות על דיווחים אמיתיים, השאר הערכה.`
            : 'הערכה לפי יום ושעה. כל דיווח שלכם משפר אותה למקום הזה.'}
        </p>
      </section>

      {/* Go */}
      <section className="mt-6 grid grid-cols-2 gap-2">
        <a
          href={wazeUrl(place)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-3 py-3 font-semibold text-surface"
        >
          <Navigation className="size-4" aria-hidden />
          ניווט ב-Waze
        </a>
        <a
          href={googleMapsUrl(place)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-line px-3 py-3 font-semibold"
        >
          עומס בגוגל מפות
        </a>
      </section>
      {osmEditUrl(place) && (
        <p className="mt-3 text-center text-xs text-muted">
          שעות או פרטים לא נכונים?{' '}
          <a href={osmEditUrl(place)!} target="_blank" rel="noreferrer" className="underline">
            תקנו ב-OpenStreetMap
          </a>
        </p>
      )}
    </article>
  )
}
