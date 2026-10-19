export interface LatLng {
  lat: number
  lng: number
}

export interface Bounds {
  south: number
  west: number
  north: number
  east: number
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function boundsDiagonalKm(b: Bounds): number {
  return distanceKm({ lat: b.south, lng: b.west }, { lat: b.north, lng: b.east })
}

export function boundsContain(outer: Bounds, inner: Bounds): boolean {
  return (
    outer.south <= inner.south && outer.west <= inner.west && outer.north >= inner.north && outer.east >= inner.east
  )
}

/** Human distance in Hebrew: "350 מ׳" / "2.4 ק״מ" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} מ׳`
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ק״מ`
}

/** Walking minutes at ~4.8 km/h */
export function walkMinutes(km: number): number {
  return Math.max(1, Math.round((km / 4.8) * 60))
}
