import { describe, expect, it } from 'vitest'
import { findSmartAlternative, getDistanceKm } from './recommendations'
import { initialCarts } from '../data/initialCarts'
import type { CoffeeCart } from '../types/cart'

const byId = (id: string) => initialCarts.find((c) => c.id === id)!

describe('getDistanceKm', () => {
  it('is zero for the same point', () => {
    expect(getDistanceKm(32, 35, 32, 35)).toBe(0)
  })
  it('matches a known distance (~1 degree latitude ≈ 111 km)', () => {
    expect(getDistanceKm(31, 35, 32, 35)).toBeCloseTo(111.2, 0)
  })
})

describe('findSmartAlternative', () => {
  it('only runs for busy carts', () => {
    expect(findSmartAlternative(byId('bakerem-karmei-yosef'), initialCarts)).toBeNull()
  })

  it('suggests a calm cart within 12 km that saves time', () => {
    const busy = byId('agalakafe-alexander')
    const alt = findSmartAlternative(busy, initialCarts)!
    expect(alt).not.toBeNull()
    expect(alt.cart.status).toBe('calm')
    expect(alt.distanceKm).toBeLessThanOrEqual(12)
    expect(alt.timeSavedMinutes).toBe(busy.waitMinutes - (alt.cart.waitMinutes + alt.driveMinutes))
    expect(alt.timeSavedMinutes).toBeGreaterThan(0)
  })

  it('returns null when no calm cart is close enough', () => {
    const lonely: CoffeeCart = { ...byId('agalakafe-alexander'), id: 'x', coordinates: { lat: 29.6, lng: 34.9 } }
    expect(findSmartAlternative(lonely, [lonely, ...initialCarts])).toBeNull()
  })
})
