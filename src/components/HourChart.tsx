import type { HourForecast } from '../lib/busyness'
import { LEVEL_LABEL } from '../lib/busyness'
import { LEVEL_BG } from './StatusTag'

interface Props {
  forecast: HourForecast[]
  /** Hour to highlight (current hour when viewing today) */
  currentHour: number | null
  /** Hour to mark as the quietest */
  quietHour: number | null
}

/** Expected busyness per open hour — taller = busier */
export function HourChart({ forecast, currentHour, quietHour }: Props) {
  if (!forecast.length) {
    return <p className="py-6 text-center text-sm text-muted">סגור כל היום</p>
  }
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" role="list" aria-label="עומס צפוי לפי שעה">
        {forecast.map((f) => {
          const isNow = f.hour === currentHour
          return (
            <div
              key={f.hour}
              role="listitem"
              aria-label={`${f.hour}:00 — ${LEVEL_LABEL[f.level]}${isNow ? ' (עכשיו)' : ''}`}
              className="relative flex h-full flex-1 flex-col justify-end"
            >
              {f.hour === quietHour && (
                <span className="mx-auto mb-1 size-1.5 shrink-0 rounded-full bg-ink" aria-label="הכי שקט" />
              )}
              <div
                className={`w-full rounded-t-[4px] ${LEVEL_BG[f.level]} ${isNow ? '' : 'opacity-55'}`}
                style={{ height: `${Math.max(10, f.score)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-[3px] text-[11px] text-muted tabular-nums">
        {forecast.map((f, i) => (
          <span
            key={f.hour}
            className={`flex-1 text-center ${f.hour === currentHour ? 'font-bold text-ink' : ''}`}
          >
            {f.hour === currentHour || (i % 3 === 0 && Math.abs(f.hour - (currentHour ?? -9)) > 1) ? f.hour : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
