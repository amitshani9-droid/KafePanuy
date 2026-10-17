import L from 'leaflet'
import type { CoffeeCart, CrowdStatus, LatLng } from '../types/cart'

/** At this zoom and closer every cart gets its own marker. */
export const CLUSTER_MAX_ZOOM = 14
/** Carts closer than this on screen (px) are grouped. */
const RADIUS_PX = 56

export interface CartCluster {
  id: string
  carts: CoffeeCart[]
  center: LatLng
  /** Calmest status in the group — drives the bubble color */
  best: CrowdStatus
  calmCount: number
}

const RANK: Record<CrowdStatus, number> = { calm: 0, moderate: 1, busy: 2 }

/**
 * Groups carts that would overlap on screen at this zoom.
 * Greedy distance-based: each ungrouped cart pulls in every other ungrouped cart
 * within RADIUS_PX of it, then groups whose bubbles would still touch are merged.
 * Carts in `keepSeparate` (selected cart, route ends) always stay individual.
 */
export function clusterCarts(
  carts: CoffeeCart[],
  zoom: number,
  keepSeparate: Set<string>,
): { singles: CoffeeCart[]; clusters: CartCluster[] } {
  if (zoom >= CLUSTER_MAX_ZOOM) return { singles: carts, clusters: [] }

  const toPx = (c: CoffeeCart) =>
    L.CRS.EPSG3857.latLngToPoint(L.latLng(c.coordinates.lat, c.coordinates.lng), zoom)

  const singles: CoffeeCart[] = []
  const points = carts.filter((c) => {
    if (keepSeparate.has(c.id)) singles.push(c)
    return !keepSeparate.has(c.id)
  }).map((cart) => ({ cart, p: toPx(cart) }))

  // Pass 1: greedy grouping around each ungrouped cart
  let groups: { members: typeof points; x: number; y: number }[] = []
  const used = new Set<number>()
  points.forEach((a, i) => {
    if (used.has(i)) return
    const members = [a]
    used.add(i)
    points.forEach((b, j) => {
      if (!used.has(j) && a.p.distanceTo(b.p) < RADIUS_PX) {
        members.push(b)
        used.add(j)
      }
    })
    groups.push({
      members,
      x: members.reduce((s, m) => s + m.p.x, 0) / members.length,
      y: members.reduce((s, m) => s + m.p.y, 0) / members.length,
    })
  })

  // Pass 2: merge groups whose centers still sit too close to each other
  let merged = true
  while (merged) {
    merged = false
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) < RADIUS_PX * 0.8) {
          const members = [...groups[i].members, ...groups[j].members]
          groups[i] = {
            members,
            x: members.reduce((s, m) => s + m.p.x, 0) / members.length,
            y: members.reduce((s, m) => s + m.p.y, 0) / members.length,
          }
          groups = groups.filter((_, k) => k !== j)
          merged = true
          break outer
        }
      }
    }
  }

  const clusters: CartCluster[] = []
  for (const g of groups) {
    if (g.members.length === 1) {
      singles.push(g.members[0].cart)
      continue
    }
    const group = g.members.map((m) => m.cart)
    const best = group.reduce((acc, c) => (RANK[c.status] < RANK[acc] ? c.status : acc), group[0].status)
    clusters.push({
      id: `${zoom}:${group.map((c) => c.id).sort().join(',')}`,
      carts: group,
      center: {
        lat: group.reduce((sum, c) => sum + c.coordinates.lat, 0) / group.length,
        lng: group.reduce((sum, c) => sum + c.coordinates.lng, 0) / group.length,
      },
      best,
      calmCount: group.filter((c) => c.status === 'calm').length,
    })
  }
  return { singles, clusters }
}
