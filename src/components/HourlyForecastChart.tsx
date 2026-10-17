import { useMemo, useState } from 'react'
import type { CoffeeCart } from '../types/cart'
import { STATUS_META } from '../data/filters'
import { getForecastInsight, getHourlyForecast, todayDayType, type DayType } from '../utils/forecast'

interface HourlyForecastChartProps {
  cart: CoffeeCart
}

const CHART_HEIGHT = 112
const DAY_OPTIONS: { value: DayType; label: string }[] = [
  { value: 'weekend', label: 'ימי שישי ושבת' },
  { value: 'weekday', label: 'אמצע שבוע' },
]

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

export default function HourlyForecastChart({ cart }: HourlyForecastChartProps) {
  const today = todayDayType()
  const [day, setDay] = useState<DayType>(today)
  const nowHour = new Date().getHours()
  const showNow = day === today

  const hours = useMemo(() => getHourlyForecast(cart, day), [cart, day])
  const insight = useMemo(() => getForecastInsight(cart, day), [cart, day])
  const maxWait = Math.max(30, ...hours.map((h) => h.waitMinutes))

  const defaultActive = showNow && hours.some((h) => h.hour === nowHour) ? nowHour : null
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? defaultActive
  const activeHour = hours.find((h) => h.hour === active) ?? null

  return (
    <section aria-label="תחזית עומס לפי שעות" className="rounded-2xl bg-surface p-4 ring-1 ring-forest/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-forest">מתי הכי פנוי? 📊</h3>
        <div className="flex rounded-full bg-oat p-0.5 text-xs font-bold" role="group" aria-label="סוג יום">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={day === opt.value}
              onClick={() => {
                setDay(opt.value)
                setHovered(null)
              }}
              className={`rounded-full px-2.5 py-1 transition ${
                day === opt.value ? 'bg-forest text-cream shadow-sm' : 'text-forest/70 hover:text-forest'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tooltip line — fixed slot above the plot so it never covers bars */}
      <div className="mb-1 h-5 text-center text-xs text-ink/70" aria-live="polite">
        {activeHour ? (
          <>
            <span className="font-display font-bold text-ink">{hh(activeHour.hour)}</span>
            {' · '}בערך <span className="font-display font-bold text-ink">{activeHour.waitMinutes}</span> דק׳ המתנה
            {' · '}
            <span className="font-bold">{STATUS_META[activeHour.status].label}</span>
            {showNow && activeHour.hour === nowHour && ' (עכשיו)'}
          </>
        ) : (
          'געו בעמודה כדי לראות פרטים'
        )}
      </div>

      {/* Plot */}
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        {/* recessive gridline at the busy threshold */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-forest/15"
          style={{ bottom: `${(15 / maxWait) * CHART_HEIGHT + 20}px` }}
          aria-hidden="true"
        />
        <div className="flex items-end gap-0.5" style={{ height: CHART_HEIGHT + 20 }}>
          {hours.map((h) => {
            const isNow = showNow && h.hour === nowHour
            const isActive = active === h.hour
            const barH = Math.max(6, (h.waitMinutes / maxWait) * CHART_HEIGHT)
            return (
              <button
                key={h.hour}
                type="button"
                onMouseEnter={() => setHovered(h.hour)}
                onFocus={() => setHovered(h.hour)}
                onClick={() => setHovered(h.hour)}
                aria-label={`${hh(h.hour)}: בערך ${h.waitMinutes} דקות המתנה, ${STATUS_META[h.status].label}${isNow ? ', עכשיו' : ''}`}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end focus:outline-none"
              >
                <span
                  className={`w-full max-w-7 rounded-t-[4px] transition-all ${STATUS_META[h.status].bgClass} ${
                    isActive || isNow ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'
                  } ${isNow ? 'ring-2 ring-forest ring-offset-2 ring-offset-surface' : ''} group-focus-visible:ring-2 group-focus-visible:ring-forest`}
                  style={{ height: barH }}
                />
                <span
                  className={`mt-1 h-4 text-[10px] leading-4 ${
                    isNow ? 'font-bold text-forest' : 'text-ink/50'
                  }`}
                >
                  {isNow ? 'עכשיו' : h.hour % 3 === 0 ? hh(h.hour) : ''}
                </span>
              </button>
            )
          })}
        </div>
        {/* baseline */}
        <div className="absolute inset-x-0 bottom-5 border-t border-forest/20" aria-hidden="true" />
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink/60">
        {(['calm', 'moderate', 'busy'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${STATUS_META[s].bgClass}`} aria-hidden="true" />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>

      <p className="mt-3 rounded-xl bg-calm/10 px-3 py-2 text-sm text-forest">
        💡 טיפ: {insight}
      </p>
      {cart.source !== 'curated' && (
        <p className="mt-2 text-xs text-ink/50">תחזית כללית לפי שעות עומס אופייניות — עוד אין מספיק דיווחים על המקום הזה.</p>
      )}
    </section>
  )
}
