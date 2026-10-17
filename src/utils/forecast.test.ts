import { describe, expect, it } from 'vitest'
import { FORECAST_END_HOUR, FORECAST_START_HOUR, getForecastInsight, getHourlyForecast, todayDayType } from './forecast'
import { initialCarts } from '../data/initialCarts'
import { statusForWait } from '../data/rewards'

const cart = initialCarts.find((c) => c.id === 'materello-ein-zivan')!

describe('forecast', () => {
  it('has one bar per hour 06:00–15:00 with consistent status', () => {
    const hours = getHourlyForecast(cart, 'weekend')
    expect(hours).toHaveLength(FORECAST_END_HOUR - FORECAST_START_HOUR + 1)
    for (const h of hours) expect(h.status).toBe(statusForWait(h.waitMinutes))
  })

  it('weekend mornings are busier than weekday mornings for a popular cart', () => {
    const at = (day: 'weekend' | 'weekday') => getHourlyForecast(cart, day).find((h) => h.hour === 10)!.waitMinutes
    expect(at('weekend')).toBeGreaterThan(at('weekday'))
  })

  it('phrases an insight', () => {
    expect(getForecastInsight(cart, 'weekend')).toMatch(/רגוע|עמוס/)
  })

  it('treats Friday and Saturday as weekend', () => {
    expect(todayDayType(new Date('2026-10-16T09:00:00'))).toBe('weekend') // Friday
    expect(todayDayType(new Date('2026-10-17T09:00:00'))).toBe('weekend') // Saturday
    expect(todayDayType(new Date('2026-10-18T09:00:00'))).toBe('weekday') // Sunday
  })
})
