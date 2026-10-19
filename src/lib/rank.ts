import type { Level, Place, PlaceKind, PlaceStatus } from '../types'
import { distanceKm, type LatLng } from './geo'

export interface RankedPlace {
  place: Place
  status: PlaceStatus
  km: number | null
}

export interface Filters {
  kind: PlaceKind | 'all'
  calmOnly: boolean
}

const LEVEL_ORDER: Record<Level, number> = { calm: 0, moderate: 1, busy: 2 }

/**
 * Open places first, quieter first, then nearer. Distance is weighted so a calm
 * place 2 km away doesn't beat a moderate one next door.
 */
export function rankPlaces(
  items: { place: Place; status: PlaceStatus }[],
  origin: LatLng | null,
  filters: Filters,
): RankedPlace[] {
  return items
    .filter(({ place, status }) => {
      if (filters.kind !== 'all' && place.kind !== filters.kind) return false
      if (filters.calmOnly && status.level !== 'calm') return false
      return true
    })
    .map(({ place, status }) => ({ place, status, km: origin ? distanceKm(origin, place) : null }))
    .sort((a, b) => cost(a) - cost(b))
}

function cost(r: RankedPlace): number {
  if (r.status.level == null) return 1000 + (r.km ?? 0)
  const crowd = LEVEL_ORDER[r.status.level] * 1.2 + (r.status.source === 'live' ? -0.2 : 0)
  return crowd + (r.km ?? 0) * 0.8
}

/** A calmer open place near a busy one — the "go there instead" suggestion */
export function calmerNearby(target: RankedPlace, all: RankedPlace[], maxKm = 2): RankedPlace | null {
  if (target.status.level !== 'busy' && target.status.level !== 'moderate') return null
  let best: RankedPlace | null = null
  let bestKm = Infinity
  for (const r of all) {
    if (r.place.key === target.place.key || r.status.level !== 'calm') continue
    const km = distanceKm(target.place, r.place)
    if (km <= maxKm && km < bestKm) {
      best = r
      bestKm = km
    }
  }
  return best
}
