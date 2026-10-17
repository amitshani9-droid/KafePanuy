import { describe, expect, it } from 'vitest'
import { matchesQuery, normalizeForSearch } from './search'
import { initialCarts } from '../data/initialCarts'

const names = (q: string) => initialCarts.filter((c) => matchesQuery(c, q)).map((c) => c.name)

describe('normalizeForSearch', () => {
  it('drops geresh/gershayim, quotes and case', () => {
    expect(normalizeForSearch('כרם מהר״ל')).toBe('כרם מהרל')
    expect(normalizeForSearch('Teo  Café')).toBe('teo café')
  })
})

describe('matchesQuery', () => {
  it('finds names written without gershayim', () => {
    expect(names('כרם מהרל')).toContain('קפה בחורשה')
  })
  it('finds English aliases', () => {
    expect(names('teo')).toEqual(['קפה תאו'])
  })
  it('requires every word (tag + region)', () => {
    const found = initialCarts.filter((c) => matchesQuery(c, 'כלבים צפון'))
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((c) => c.region === 'north' && c.tags.includes('dogs'))).toBe(true)
  })
  it('empty query matches everything', () => {
    expect(names('   ').length).toBe(initialCarts.length)
  })
})
