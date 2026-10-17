import type { CoffeeCart } from '../types/cart'

/** Max straight-line distance for a suggested alternative. */
const MAX_ALTERNATIVE_KM = 12
/** Straight-line → road distance fudge factor for rural Sharon roads. */
const ROAD_FACTOR = 1.25
/** Average driving speed on local roads, km/h. */
const AVG_SPEED_KMH = 50

export interface SmartAlternative {
  cart: CoffeeCart
  distanceKm: number
  driveMinutes: number
  /** selected.waitMinutes − (alt.waitMinutes + driveMinutes) */
  timeSavedMinutes: number
}

/** Great-circle distance in km (Haversine). */
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function estimateDriveMinutes(distanceKm: number): number {
  return Math.max(2, Math.ceil(((distanceKm * ROAD_FACTOR) / AVG_SPEED_KMH) * 60))
}

/** Share of the selected cart's tags that the candidate also has (0–1). */
function vibeSimilarity(a: CoffeeCart, b: CoffeeCart): number {
  if (a.tags.length === 0) return 0
  return a.tags.filter((t) => b.tags.includes(t)).length / a.tags.length
}

/**
 * For a busy cart, find the best calm cart within 12 km that actually saves time.
 * Ranks by vibe similarity first, then time saved, then rating.
 */
export function findSmartAlternative(selectedCart: CoffeeCart, allCarts: CoffeeCart[]): SmartAlternative | null {
  if (selectedCart.status !== 'busy') return null

  const { lat, lng } = selectedCart.coordinates
  const candidates: (SmartAlternative & { score: number })[] = []

  for (const cart of allCarts) {
    if (cart.id === selectedCart.id || cart.status !== 'calm') continue
    const distanceKm = getDistanceKm(lat, lng, cart.coordinates.lat, cart.coordinates.lng)
    if (distanceKm > MAX_ALTERNATIVE_KM) continue

    const driveMinutes = estimateDriveMinutes(distanceKm)
    const timeSavedMinutes = selectedCart.waitMinutes - (cart.waitMinutes + driveMinutes)
    if (timeSavedMinutes <= 0) continue

    const score = vibeSimilarity(selectedCart, cart) * 10 + timeSavedMinutes * 0.3 + cart.rating
    candidates.push({ cart, distanceKm, driveMinutes, timeSavedMinutes, score })
  }

  if (candidates.length === 0) return null
  const { score: _score, ...best } = candidates.reduce((a, b) => (b.score > a.score ? b : a))
  return best
}
