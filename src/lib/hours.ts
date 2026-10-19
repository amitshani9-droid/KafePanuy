import type { Place, PlaceKind } from '../types'

/**
 * A small parser for the common subset of OSM opening_hours:
 *   "Su-Th 07:00-19:00; Fr 07:00-14:00; Sa off", "Mo,We 08:00-12:00,16:00-20:00",
 *   "24/7", "18:00-02:00" (past midnight). Later rules override earlier ones for the
 *   days they name, as in OSM. Holiday rules (PH/SH) are ignored. Anything fancier
 *   (months, week numbers, sunrise…) makes the whole value unparseable, and the place
 *   falls back to typical hours marked as a guess.
 */

/** Typical Israeli hours, used only when the map has none (shown as "שעות משוערות") */
const DEFAULT_HOURS: Record<PlaceKind, string> = {
  cafe: 'Su-Th 07:00-21:00; Fr 07:00-15:00; Sa 09:00-20:00',
  cart: 'Su-Th 06:30-13:00; Fr,Sa 07:00-13:00',
}

/** [startMinute, endMinute) within one day; end ≤ 1440 */
type Interval = [number, number]
/** Index 0 = Sunday, like Date.getDay() */
export type Week = Interval[][]

const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseDays(spec: string): number[] | null {
  const days = new Set<number>()
  for (const part of spec.split(',')) {
    const m = /^([A-Z][a-z])(?:-([A-Z][a-z]))?$/.exec(part.trim())
    if (!m) return null
    const a = DAY_CODES.indexOf(m[1])
    const b = m[2] ? DAY_CODES.indexOf(m[2]) : a
    if (a < 0 || b < 0) return null
    // Ranges wrap around the week ("Fr-Mo"); OSM weeks start on Monday but order doesn't matter here
    for (let d = a; ; d = (d + 1) % 7) {
      days.add(d)
      if (d === b) break
    }
  }
  return [...days]
}

function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null
  return h * 60 + min
}

function parseTimes(spec: string): [number, number][] | null {
  const out: [number, number][] = []
  for (const part of spec.split(',')) {
    const [a, b] = part.trim().split('-')
    if (!a || !b) return null
    const start = toMinutes(a)
    let end = toMinutes(b)
    if (start == null || end == null) return null
    if (end <= start) end += 24 * 60 // past midnight
    out.push([start, end])
  }
  return out
}

export function parseOpeningHours(value: string): Week | null {
  const v = value.trim()
  if (!v) return null
  const week: Week = Array.from({ length: 7 }, () => [])
  if (v === '24/7') {
    for (const d of week) d.push([0, 1440])
    return week
  }
  // Collect per-day ranges (minutes may exceed 1440 for overnight), later rules replace earlier days
  const perDay: ([number, number][] | null)[] = Array(7).fill(null)
  for (const raw of v.split(';')) {
    const rule = raw.trim()
    if (!rule) continue
    if (/\b(PH|SH)\b/.test(rule)) continue
    const m = /^((?:[A-Z][a-z](?:-[A-Z][a-z])?)(?:\s*,\s*[A-Z][a-z](?:-[A-Z][a-z])?)*)?\s*(.*)$/.exec(rule)
    if (!m) return null
    const days = m[1] ? parseDays(m[1].replace(/\s+/g, '')) : [0, 1, 2, 3, 4, 5, 6]
    if (!days) return null
    const rest = m[2].trim()
    let ranges: [number, number][]
    if (rest === 'off' || rest === 'closed') ranges = []
    else if ((rest === '' && m[1]) || rest === 'open') ranges = [[0, 1440]] // "Mo-Fr" alone = all day
    else {
      const t = parseTimes(rest.replace(/\s+/g, ''))
      if (!t) return null
      ranges = t
    }
    for (const d of days) perDay[d] = ranges
  }
  perDay.forEach((ranges, d) => {
    for (const [s, e] of ranges ?? []) {
      week[d].push([s, Math.min(e, 1440)])
      if (e > 1440) week[(d + 1) % 7].push([0, e - 1440])
    }
  })
  return week
}

export interface Schedule {
  week: Week
  /** true when the hours came from the map data, false when guessed */
  known: boolean
}

const cache = new Map<string, Schedule>()

export function getSchedule(place: Pick<Place, 'kind' | 'openingHours'> & { key?: string }): Schedule {
  const cacheKey = `${place.kind}|${place.openingHours ?? ''}`
  let s = cache.get(cacheKey)
  if (!s) {
    const week = place.openingHours ? parseOpeningHours(place.openingHours) : null
    s = week ? { week, known: true } : { week: parseOpeningHours(DEFAULT_HOURS[place.kind])!, known: false }
    cache.set(cacheKey, s)
  }
  return s
}

const minuteOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

export function isOpenAt(schedule: Schedule, date: Date): boolean {
  const m = minuteOfDay(date)
  return schedule.week[date.getDay()].some(([s, e]) => m >= s && m < e)
}

/** Next time the open/closed state flips, searching up to a week ahead */
export function nextChange(schedule: Schedule, from: Date): Date | undefined {
  const open = isOpenAt(schedule, from)
  const t = new Date(from)
  t.setSeconds(0, 0)
  // Candidate instants: interval boundaries over the next 8 days
  for (let dayOff = 0; dayOff < 8; dayOff++) {
    const day = new Date(t)
    day.setDate(t.getDate() + dayOff)
    day.setHours(0, 0, 0, 0)
    const bounds = schedule.week[day.getDay()].flatMap(([s, e]) => [s, e]).sort((a, b) => a - b)
    for (const b of bounds) {
      const at = new Date(day)
      at.setMinutes(b)
      if (at <= from) continue
      if (isOpenAt(schedule, at) !== open) return at
    }
  }
  return undefined
}

export interface OpenState {
  open: boolean
  known: boolean
  /** When the state next changes (closes if open, opens if closed) */
  changeAt?: Date
}

export function openState(schedule: Schedule, now: Date): OpenState {
  return { open: isOpenAt(schedule, now), known: schedule.known, changeAt: nextChange(schedule, now) }
}

/** Hours (0–23) of the given day during which the place is open for at least part of the hour */
export function openHoursOfDay(schedule: Schedule, day: Date): number[] {
  const ranges = schedule.week[day.getDay()]
  const hours: number[] = []
  for (let h = 0; h < 24; h++) {
    if (ranges.some(([s, e]) => s < (h + 1) * 60 - 10 && e > h * 60 + 10)) hours.push(h)
  }
  return hours
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** "פתוח עד 21:00" / "נפתח מחר ב-07:00" / "סגור" */
export function describeOpenState(state: OpenState, now: Date): string {
  const { open, changeAt } = state
  if (!changeAt) return open ? 'פתוח תמיד' : 'סגור'
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const when =
    changeAt.toDateString() === now.toDateString()
      ? formatTime(changeAt)
      : changeAt.toDateString() === tomorrow.toDateString()
        ? `מחר ב-${formatTime(changeAt)}`
        : `ביום ${DAY_NAMES[changeAt.getDay()]} ב-${formatTime(changeAt)}`
  if (open) return `פתוח עד ${when}`
  return changeAt.toDateString() === now.toDateString() ? `נפתח ב-${when}` : `נפתח ${when}`
}
