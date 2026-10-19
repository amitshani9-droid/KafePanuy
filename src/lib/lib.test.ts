import { describe, expect, it } from 'vitest'
import type { Place, Report } from '../types'
import {
  baselineScore,
  computeStatus,
  dayForecast,
  levelForScore,
  liveScore,
  quietestHour,
  slotScore,
} from './busyness'
import { describeOpenState, getSchedule, openHoursOfDay, openState, parseOpeningHours } from './hours'
import { classify, parseElements } from './overpass'
import { profilesFromReports } from './backend'
import { formatDistance } from './geo'

// Monday 2026-10-19 (dow 1) and Friday 2026-10-23 (dow 5), local time
const mon = (h: number, m = 0) => new Date(2026, 9, 19, h, m)
const fri = (h: number, m = 0) => new Date(2026, 9, 23, h, m)

const cafe: Place = {
  key: 'osm:node/1',
  name: 'קפה בדיקה',
  kind: 'cafe',
  lat: 32.3,
  lng: 34.9,
  openingHours: 'Su-Th 07:00-19:00; Fr 07:00-14:00; Sa off',
  source: 'osm',
}
const cart: Place = { ...cafe, key: 'osm:node/2', kind: 'cart', openingHours: undefined }

describe('hours', () => {
  it('parses known hours', () => {
    const s = getSchedule(cafe)
    expect(s.known).toBe(true)
    expect(openState(s, mon(10)).open).toBe(true)
    expect(openState(s, mon(20)).open).toBe(false)
    expect(openState(s, fri(15)).open).toBe(false)
  })

  it('falls back to typical hours and marks them as guessed', () => {
    const s = getSchedule(cart)
    expect(s.known).toBe(false)
    expect(openState(s, mon(7)).open).toBe(true)
    expect(openState(s, mon(18)).open).toBe(false)
  })

  it('survives holiday rules the library cannot evaluate for Israel', () => {
    const s = getSchedule({ ...cafe, key: 'osm:node/3', openingHours: 'Mo-Fr 08:00-18:00; PH off' })
    expect(s.known).toBe(true)
    expect(openState(s, mon(9)).open).toBe(true)
  })

  it('parses common OSM formats', () => {
    expect(parseOpeningHours('24/7')![3]).toEqual([[0, 1440]])
    const w = parseOpeningHours('Mo,We 08:00-12:00,16:00-20:00')!
    expect(w[1]).toEqual([
      [480, 720],
      [960, 1200],
    ])
    expect(w[2]).toEqual([])
    // later rule overrides earlier days
    expect(parseOpeningHours('Mo-Su 08:00-20:00; Sa off')![6]).toEqual([])
    // overnight spills into the next day
    const night = parseOpeningHours('Fr 18:00-02:00')!
    expect(night[5]).toEqual([[1080, 1440]])
    expect(night[6]).toEqual([[0, 120]])
    expect(parseOpeningHours('Jan-Mar Mo-Fr 08:00-12:00')).toBeNull()
    expect(parseOpeningHours('sunrise-sunset')).toBeNull()
  })

  it('finds closing time across midnight', () => {
    const s = getSchedule({ kind: 'cafe', openingHours: 'Mo 18:00-02:00' })
    const st = openState(s, mon(23))
    expect(st.open).toBe(true)
    expect(describeOpenState(st, mon(23))).toBe('פתוח עד מחר ב-02:00')
  })

  it('ignores garbage hours', () => {
    expect(getSchedule({ ...cafe, key: 'osm:node/4', openingHours: 'כל יום חוץ משבת' }).known).toBe(false)
  })

  it('lists open hours for a day and describes state', () => {
    const s = getSchedule(cafe)
    const hours = openHoursOfDay(s, mon(0))
    expect(hours[0]).toBe(7)
    expect(hours[hours.length - 1]).toBe(18)
    expect(describeOpenState(openState(s, mon(10)), mon(10))).toBe('פתוח עד 19:00')
    expect(describeOpenState(openState(s, mon(20)), mon(20))).toBe('נפתח מחר ב-07:00')
  })
})

describe('busyness', () => {
  it('maps scores to levels', () => {
    expect(levelForScore(10)).toBe('calm')
    expect(levelForScore(50)).toBe('moderate')
    expect(levelForScore(85)).toBe('busy')
  })

  it('has a Friday brunch peak and quiet weekday evenings', () => {
    expect(baselineScore('cafe', 5, 10)).toBeGreaterThan(70)
    expect(baselineScore('cafe', 1, 20)).toBeLessThan(40)
    expect(baselineScore('cart', 1, 7)).toBeGreaterThan(baselineScore('cart', 1, 12))
  })

  it('weights fresh reports above old ones and ignores stale ones', () => {
    const now = mon(10).getTime()
    const reports: Report[] = [
      { placeKey: 'x', level: 'busy', createdAt: now - 2 * 60_000 },
      { placeKey: 'x', level: 'calm', createdAt: now - 40 * 60_000 },
      { placeKey: 'x', level: 'calm', createdAt: now - 90 * 60_000 },
    ]
    const live = liveScore(reports, now)!
    expect(live.reports).toBe(2)
    expect(levelForScore(live.score)).toBe('busy')
    expect(liveScore([reports[2]], now)).toBeNull()
  })

  it('prefers live reports, then learned data, then the estimate', () => {
    const now = mon(10)
    const live = computeStatus(cafe, now, {
      reports: [{ placeKey: cafe.key, level: 'busy', createdAt: now.getTime() - 5 * 60_000 }],
    })
    expect(live.source).toBe('live')
    expect(live.level).toBe('busy')
    expect(live.minutesAgo).toBe(5)

    const learned = computeStatus(cafe, now, {
      profile: { placeKey: cafe.key, slots: { '1-10': { score: 90, n: 12 } } },
    })
    expect(learned.source).toBe('learned')
    expect(learned.score).toBeGreaterThan(70)

    expect(computeStatus(cafe, now).source).toBe('estimate')
    expect(computeStatus(cafe, mon(21)).source).toBe('closed')
  })

  it('needs enough samples before trusting learned data', () => {
    expect(slotScore('cafe', 1, 10, { placeKey: 'x', slots: { '1-10': { score: 90, n: 1 } } }).learned).toBe(false)
  })

  it('forecasts open hours and finds the quietest remaining one', () => {
    const f = dayForecast(cafe, mon(0))
    expect(f.map((h) => h.hour)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
    const q = quietestHour(f, mon(12, 30))!
    expect(q.hour).toBeGreaterThanOrEqual(12)
    expect(quietestHour(f, mon(20))).toBeNull()
  })
})

describe('overpass', () => {
  it('classifies carts by tags and name', () => {
    expect(classify({ amenity: 'cafe', name: 'עגלת הקפה של יוסי' })).toBe('cart')
    expect(classify({ amenity: 'cafe', street_vendor: 'yes', name: 'x' })).toBe('cart')
    expect(classify({ amenity: 'cafe', name: 'ארומה' })).toBe('cafe')
  })

  it('parses elements, prefers Hebrew names, skips unnamed and duplicates', () => {
    const places = parseElements([
      { type: 'node', id: 1, lat: 32, lon: 34.8, tags: { amenity: 'cafe', name: 'Aroma', 'name:he': 'ארומה' } },
      { type: 'way', id: 2, center: { lat: 32.1, lon: 34.9 }, tags: { amenity: 'cafe', name: 'Cafe' } },
      { type: 'node', id: 3, lat: 32, lon: 34.8, tags: { amenity: 'cafe' } },
      { type: 'node', id: 1, lat: 32, lon: 34.8, tags: { amenity: 'cafe', name: 'Aroma' } },
    ])
    expect(places.map((p) => p.key)).toEqual(['osm:node/1', 'osm:way/2'])
    expect(places[0].name).toBe('ארומה')
  })
})

describe('profiles & formatting', () => {
  it('builds learned profiles from reports', () => {
    const t = mon(10, 15).getTime()
    const p = profilesFromReports([
      { placeKey: 'a', level: 'busy', createdAt: t },
      { placeKey: 'a', level: 'calm', createdAt: t + 60_000 },
    ]).get('a')!
    expect(p.slots['1-10']).toEqual({ score: 52.5, n: 2 })
  })

  it('formats distance in Hebrew', () => {
    expect(formatDistance(0.34)).toBe('340 מ׳')
    expect(formatDistance(2.42)).toBe('2.4 ק״מ')
  })
})
