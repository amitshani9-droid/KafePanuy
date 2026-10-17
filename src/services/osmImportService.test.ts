import { describe, expect, it } from 'vitest'
import { boundsDiagonalKm, formatOpeningHours, MAX_SEARCH_DIAGONAL_KM } from './osmImportService'

describe('formatOpeningHours', () => {
  it('translates OSM day codes to Hebrew', () => {
    expect(formatOpeningHours('Su-Th 09:00-23:00; Fr 08:30-15:00')).toBe('א׳–ה׳ 09:00–23:00 · ו׳ 08:30–15:00')
  })
  it('handles closed days, 24/7 and missing values', () => {
    expect(formatOpeningHours('Mo-Fr 07:00-14:00; Sa off')).toBe('ב׳–ו׳ 07:00–14:00 · ש׳ סגור')
    expect(formatOpeningHours('24/7')).toBe('פתוח 24/7')
    expect(formatOpeningHours(undefined)).toBe('שעות פתיחה לא ידועות')
  })
})

describe('search area limit', () => {
  it('allows a town-sized area and rejects a country-sized one', () => {
    expect(boundsDiagonalKm({ south: 32.66, west: 35.15, north: 32.72, east: 35.24 })).toBeLessThan(MAX_SEARCH_DIAGONAL_KM)
    expect(boundsDiagonalKm({ south: 29.5, west: 34.2, north: 33.3, east: 35.9 })).toBeGreaterThan(MAX_SEARCH_DIAGONAL_KM)
  })
})
