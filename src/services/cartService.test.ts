import { beforeEach, describe, expect, it } from 'vitest'
import * as store from './cartService'
import { initialCarts } from '../data/initialCarts'
import { REWARDS } from '../data/rewards'

beforeEach(() => localStorage.clear())

describe('carts', () => {
  it('starts from the curated seed', () => {
    expect(store.getCarts()).toHaveLength(initialCarts.length)
  })

  it('skips duplicates by id and by distance (~40 m)', () => {
    const base = initialCarts[0]
    const sameSpot = { ...base, id: 'osm-node-1', source: 'osm' as const }
    const farAway = { ...base, id: 'osm-node-2', source: 'osm' as const, coordinates: { lat: 31.5, lng: 34.8 } }
    const { added } = store.addCarts([sameSpot, farAway, farAway])
    expect(added.map((c) => c.id)).toEqual(['osm-node-2'])
    expect(store.getCarts()).toHaveLength(initialCarts.length + 1) // persisted
  })
})

describe('reports & points', () => {
  it('updates the cart, stores the report and awards 40 base points', () => {
    const cart = initialCarts.find((c) => c.status === 'busy')!
    const before = store.getPoints()
    const r = store.submitReport({ cartId: cart.id, status: 'calm', waitMinutes: 3, fieldTags: ['חניה בשפע 🚗'], note: '  טיפ  ' })
    const updated = r.carts.find((c) => c.id === cart.id)!
    expect(updated.status).toBe('calm')
    expect(updated.dataSource).toBe('live')
    expect(updated.latestTip).toBe('טיפ')
    expect(updated.verifiedGps).toBe(false)
    expect(r.report.verifiedGps).toBe(false)
    expect(r.report.pointsEarned).toBe(40)
    expect(r.points).toBe(before + 40)
    expect(store.getReports()).toHaveLength(1)
  })

  it('awards 60 points total (40 base + 20 GPS bonus) and sets verifiedGps when submitted within GPS range', () => {
    const cart = initialCarts[0]
    const before = store.getPoints()
    const r = store.submitReport({
      cartId: cart.id,
      status: 'calm',
      waitMinutes: 2,
      fieldTags: [],
      verifiedGps: true,
    })
    const updated = r.carts.find((c) => c.id === cart.id)!
    expect(updated.verifiedGps).toBe(true)
    expect(updated.dataSource).toBe('live')
    expect(r.report.verifiedGps).toBe(true)
    expect(r.report.pointsEarned).toBe(60)
    expect(r.points).toBe(before + 60)
  })

  it('redeems only when the balance is enough', () => {
    const coffee = REWARDS.find((r) => r.cost === 100)!
    expect(store.redeemReward(coffee)).not.toBeNull() // 120 → 20
    expect(store.getPoints()).toBe(20)
    expect(store.redeemReward(coffee)).toBeNull()
    expect(store.getLifetimePoints()).toBe(120) // redeeming never lowers rank
  })
})

describe('ratings', () => {
  it('first rating earns points, later ones do not', () => {
    const id = initialCarts[0].id
    expect(store.rateCart(id, 5).firstTime).toBe(true)
    const again = store.rateCart(id, 3)
    expect(again.firstTime).toBe(false)
    expect(again.points).toBe(120 + store.RATING_POINTS)
  })

  it('blends my rating into the average', () => {
    const cart = { ...initialCarts[0], rating: 4, reviewCount: 1 }
    expect(store.withMyRating(cart, 5)).toMatchObject({ rating: 4.5, reviewCount: 2 })
    expect(store.withMyRating(cart, undefined)).toBe(cart)
  })
})

describe('owner PIN', () => {
  it('claims once, then verifies only the right PIN', () => {
    const id = initialCarts[0].id
    expect(store.claimCart(id, '12')).toBe(false) // too short
    expect(store.claimCart(id, '2468')).toBe(true)
    expect(store.claimCart(id, '1111')).toBe(false) // already claimed
    expect(store.verifyOwnerPin(id, '2468')).toBe(true)
    expect(store.verifyOwnerPin(id, '1111')).toBe(false)
    expect(localStorage.getItem('kafe-panuy:v1:owners')).not.toContain('2468')
  })
})

describe('reset', () => {
  it('wipes app data back to the seed', () => {
    store.submitReport({ cartId: initialCarts[0].id, status: 'busy', waitMinutes: 30, fieldTags: [] })
    store.resetDemoData()
    expect(store.getReports()).toHaveLength(0)
    expect(store.getPoints()).toBe(120)
  })
})
