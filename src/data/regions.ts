import type { LatLng, Region } from '../types/cart'

export type RegionFilter = Region | 'all'

export const REGION_OPTIONS: { value: RegionFilter; label: string; emoji: string }[] = [
  { value: 'all', label: 'כל הארץ', emoji: '🇮🇱' },
  { value: 'sharon', label: 'שרון ועמק חפר', emoji: '🌿' },
  { value: 'north', label: 'צפון וגליל', emoji: '🌲' },
  { value: 'center', label: 'מרכז והרי ירושלים', emoji: '⛰️' },
  { value: 'south', label: 'דרום ונגב', emoji: '☀️' },
]

export const REGION_LABELS: Record<Region, string> = {
  sharon: 'שרון ועמק חפר',
  north: 'צפון וגליל',
  center: 'מרכז והרי ירושלים',
  south: 'דרום ונגב',
}

/** Rough latitude bands — used for OSM-imported and user-added carts. */
export function regionForLatLng({ lat }: LatLng): Region {
  if (lat >= 32.5) return 'north'
  if (lat >= 32.15) return 'sharon'
  if (lat >= 31.62) return 'center'
  return 'south'
}
