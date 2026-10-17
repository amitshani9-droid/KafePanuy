import { describe, expect, it } from 'vitest'
import { clusterCarts, CLUSTER_MAX_ZOOM } from './clusters'
import { initialCarts } from '../data/initialCarts'

describe('clusterCarts', () => {
  it('keeps every cart exactly once', () => {
    const { singles, clusters } = clusterCarts(initialCarts, 8, new Set())
    const ids = [...singles.map((c) => c.id), ...clusters.flatMap((g) => g.carts.map((c) => c.id))]
    expect(ids.sort()).toEqual(initialCarts.map((c) => c.id).sort())
  })

  it('groups carts at country zoom', () => {
    const { clusters } = clusterCarts(initialCarts, 8, new Set())
    expect(clusters.length).toBeGreaterThan(0)
  })

  it('does not cluster when zoomed in', () => {
    const { singles, clusters } = clusterCarts(initialCarts, CLUSTER_MAX_ZOOM, new Set())
    expect(clusters).toHaveLength(0)
    expect(singles).toHaveLength(initialCarts.length)
  })

  it('never groups a cart that must stay separate', () => {
    const keep = initialCarts[0].id
    const { singles, clusters } = clusterCarts(initialCarts, 8, new Set([keep]))
    expect(singles.some((c) => c.id === keep)).toBe(true)
    expect(clusters.some((g) => g.carts.some((c) => c.id === keep))).toBe(false)
  })

  it('reports the calmest status and calm count', () => {
    const { clusters } = clusterCarts(initialCarts, 8, new Set())
    for (const g of clusters) {
      expect(g.calmCount).toBe(g.carts.filter((c) => c.status === 'calm').length)
      if (g.calmCount > 0) expect(g.best).toBe('calm')
    }
  })
})
