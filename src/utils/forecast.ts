import type { CoffeeCart, CrowdStatus } from '../types/cart'
import { statusForWait } from '../data/rewards'

export type DayType = 'weekend' | 'weekday'

export interface HourForecast {
  hour: number
  waitMinutes: number
  status: CrowdStatus
}

export const FORECAST_START_HOUR = 6
export const FORECAST_END_HOUR = 15

/** Gaussian bump centered at `center` (hours) */
const bump = (t: number, center: number, width: number, height: number) =>
  height * Math.exp(-((t - center) ** 2) / (2 * width ** 2))

/** Typical-day crowd curve (wait minutes) — weekend brunch peak vs. weekday commute peak. */
function baseCurve(t: number, day: DayType): number {
  return day === 'weekend'
    ? 2 + bump(t, 9.75, 1.15, 26) + bump(t, 13, 0.8, 4)
    : 2 + bump(t, 7.6, 0.6, 11) + bump(t, 10.5, 0.9, 6) + bump(t, 13.2, 0.7, 4)
}

/** Popular carts and cyclist hangouts get busier weekend mornings. */
function cartScale(cart: CoffeeCart, day: DayType): number {
  const popularity = 0.55 + Math.min(cart.reviewCount, 650) / 650
  const cyclistBoost = day === 'weekend' && cart.tags.includes('cyclist') ? 1.15 : 1
  return popularity * cyclistBoost
}

function waitAt(cart: CoffeeCart, t: number, day: DayType): number {
  return Math.max(1, Math.round(baseCurve(t, day) * cartScale(cart, day)))
}

export function getHourlyForecast(cart: CoffeeCart, day: DayType): HourForecast[] {
  const hours: HourForecast[] = []
  for (let h = FORECAST_START_HOUR; h <= FORECAST_END_HOUR; h++) {
    // Average the half-hours so each bar represents the whole hour
    const waitMinutes = Math.round((waitAt(cart, h, day) + waitAt(cart, h + 0.5, day)) / 2)
    hours.push({ hour: h, waitMinutes, status: statusForWait(waitMinutes) })
  }
  return hours
}

/** Typical wait right now for a cart we know nothing about (e.g. OSM imports). */
export function estimateWaitNow(date = new Date()): number {
  const t = date.getHours() + date.getMinutes() / 60
  return Math.max(1, Math.round(baseCurve(t, todayDayType(date)) * 0.6))
}

const fmt = (t: number) => `${String(Math.floor(t)).padStart(2, '0')}:${t % 1 ? '30' : '00'}`

/**
 * Finds the calm windows at half-hour resolution and phrases a tip,
 * e.g. "השעה הכי רגועה להגיע היא לפני 08:30 או אחרי 12:00".
 */
export function getForecastInsight(cart: CoffeeCart, day: DayType): string {
  const slots: number[] = []
  for (let t = FORECAST_START_HOUR; t <= FORECAST_END_HOUR + 0.5; t += 0.5) slots.push(t)
  const calm = slots.map((t) => statusForWait(waitAt(cart, t, day)) === 'calm')

  if (calm.every(Boolean)) return 'רגוע כמעט כל היום — אפשר להגיע מתי שבא לך 😎'
  if (!calm.some(Boolean)) {
    const quietest = slots.reduce((a, b) => (waitAt(cart, b, day) < waitAt(cart, a, day) ? b : a))
    return `עמוס רוב היום — הכי פחות תור בסביבות ${fmt(quietest)}`
  }

  const firstBusy = calm.indexOf(false)
  const lastBusy = calm.lastIndexOf(false)
  const before = firstBusy > 0 ? `לפני ${fmt(slots[firstBusy])}` : null
  const after = lastBusy < slots.length - 1 ? `אחרי ${fmt(slots[lastBusy + 1])}` : null

  if (before && after) return `השעה הכי רגועה להגיע היא ${before} או ${after}`
  return `השעה הכי רגועה להגיע היא ${before ?? after}`
}

export function todayDayType(date = new Date()): DayType {
  const d = date.getDay() // 5 = Friday, 6 = Saturday
  return d === 5 || d === 6 ? 'weekend' : 'weekday'
}
