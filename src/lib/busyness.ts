import type { LearnedProfile, Level, Place, PlaceKind, PlaceStatus, Report } from '../types'
import { getSchedule, isOpenAt, openHoursOfDay } from './hours'

/** How long a report counts as "live" */
export const LIVE_WINDOW_MIN = 45
/** Recency half-life for weighting live reports */
const HALF_LIFE_MIN = 15
/** Past reports needed in a day/hour slot before we trust the learned value */
export const LEARNED_MIN_SAMPLES = 3

export const LEVEL_SCORE: Record<Level, number> = { calm: 15, moderate: 55, busy: 90 }

export function levelForScore(score: number): Level {
  if (score < 40) return 'calm'
  if (score < 70) return 'moderate'
  return 'busy'
}

interface Peak {
  at: number // hour, fractional
  height: number
  width: number // hours (std-dev-ish)
}

interface DayShape {
  base: number
  peaks: Peak[]
}

/**
 * Typical Israeli patterns. Sun–Thu (0–4) are work days, Friday (5) is the big
 * brunch morning, Saturday (6) is a slow late morning out.
 */
const SHAPES: Record<PlaceKind, { weekday: DayShape; friday: DayShape; saturday: DayShape }> = {
  cafe: {
    weekday: {
      base: 18,
      peaks: [
        { at: 8, height: 45, width: 1.1 },
        { at: 10.5, height: 35, width: 1.4 },
        { at: 13, height: 35, width: 1.1 },
        { at: 17, height: 30, width: 1.5 },
      ],
    },
    friday: { base: 22, peaks: [{ at: 10.5, height: 65, width: 1.9 }] },
    saturday: {
      base: 20,
      peaks: [
        { at: 11, height: 60, width: 2 },
        { at: 17, height: 30, width: 1.5 },
      ],
    },
  },
  cart: {
    weekday: {
      base: 12,
      peaks: [
        { at: 7.5, height: 55, width: 1 },
        { at: 10, height: 25, width: 1.2 },
      ],
    },
    friday: { base: 18, peaks: [{ at: 9, height: 72, width: 1.6 }] },
    saturday: { base: 18, peaks: [{ at: 9.5, height: 70, width: 1.7 }] },
  },
}

/** Rule-of-thumb busyness (0–100) at a given weekday and hour, ignoring opening hours */
export function baselineScore(kind: PlaceKind, dow: number, hour: number): number {
  const set = SHAPES[kind]
  const shape = dow === 5 ? set.friday : dow === 6 ? set.saturday : set.weekday
  const t = hour + 0.5
  let score = shape.base
  for (const p of shape.peaks) score += p.height * Math.exp(-((t - p.at) ** 2) / (2 * p.width ** 2))
  return Math.round(Math.min(100, Math.max(0, score)))
}

/** Weighted live score from recent reports; null when nothing recent */
export function liveScore(
  reports: Report[],
  now: number,
): { score: number; reports: number; lastAt: number } | null {
  let wSum = 0
  let sSum = 0
  let lastAt = 0
  let count = 0
  for (const r of reports) {
    const ageMin = (now - r.createdAt) / 60_000
    if (ageMin < -2 || ageMin > LIVE_WINDOW_MIN) continue
    const w = Math.pow(0.5, Math.max(0, ageMin) / HALF_LIFE_MIN)
    wSum += w
    sSum += w * LEVEL_SCORE[r.level]
    lastAt = Math.max(lastAt, r.createdAt)
    count++
  }
  if (!count) return null
  return { score: Math.round(sSum / wSum), reports: count, lastAt }
}

/** Learned score for a slot, blended toward the baseline while samples are few */
export function slotScore(
  kind: PlaceKind,
  dow: number,
  hour: number,
  profile?: LearnedProfile,
): { score: number; learned: boolean } {
  const base = baselineScore(kind, dow, hour)
  const slot = profile?.slots[`${dow}-${hour}`]
  if (!slot || slot.n < LEARNED_MIN_SAMPLES) return { score: base, learned: false }
  const k = 4
  const score = (slot.n * slot.score + k * base) / (slot.n + k)
  return { score: Math.round(score), learned: true }
}

export interface PlaceData {
  reports?: Report[]
  profile?: LearnedProfile
}

export function computeStatus(place: Place, now: Date, data: PlaceData = {}): PlaceStatus {
  const schedule = getSchedule(place)
  const t = now.getTime()
  const live = liveScore(data.reports ?? [], t)

  // A fresh report from someone at the place beats any hours data.
  if (live) {
    return {
      level: levelForScore(live.score),
      score: live.score,
      source: 'live',
      minutesAgo: Math.max(0, Math.round((t - live.lastAt) / 60_000)),
      reports: live.reports,
    }
  }
  if (!isOpenAt(schedule, now)) return { level: null, score: 0, source: 'closed' }

  const { score, learned } = slotScore(place.kind, now.getDay(), now.getHours(), data.profile)
  return { level: levelForScore(score), score, source: learned ? 'learned' : 'estimate' }
}

export interface HourForecast {
  hour: number
  score: number
  level: Level
  learned: boolean
}

/** Expected busyness for each open hour of the given day */
export function dayForecast(place: Place, day: Date, profile?: LearnedProfile): HourForecast[] {
  const schedule = getSchedule(place)
  const dow = day.getDay()
  const hours = openHoursOfDay(schedule, day)
  return hours.map((hour, i) => {
    const s = slotScore(place.kind, dow, hour, profile)
    // First/last open hour is usually quieter (setting up / winding down)
    const edge = i === 0 || i === hours.length - 1 ? 0.8 : 1
    const score = Math.round(s.score * edge)
    return { hour, score, level: levelForScore(score), learned: s.learned }
  })
}

/** Quietest remaining hour today (including the current one), or null if closed for the rest of the day */
export function quietestHour(forecast: HourForecast[], now: Date): HourForecast | null {
  const remaining = forecast.filter((f) => f.hour >= now.getHours())
  if (!remaining.length) return null
  return remaining.reduce((best, f) => (f.score < best.score ? f : best))
}

export const LEVEL_LABEL: Record<Level, string> = {
  calm: 'פנוי',
  moderate: 'בינוני',
  busy: 'עמוס',
}

export function describeSource(status: PlaceStatus): string {
  switch (status.source) {
    case 'live': {
      const m = status.minutesAgo ?? 0
      const ago = m <= 1 ? 'עכשיו' : `לפני ${m} דק׳`
      const n = status.reports ?? 1
      return n > 1 ? `${n} דיווחים · אחרון ${ago}` : `דיווח ${ago}`
    }
    case 'learned':
      return 'לפי דיווחים מימים קודמים'
    case 'estimate':
      return 'הערכה לפי יום ושעה'
    case 'closed':
      return 'סגור עכשיו'
  }
}
