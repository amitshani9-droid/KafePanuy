import type { Place } from '../types'

export function wazeUrl(p: Place): string {
  return `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`
}

/** Google Maps page for the place — shows Google's own "live busyness" when it has it */
export function googleMapsUrl(p: Place): string {
  // Searching by name around the exact coordinates picks the right branch of a chain
  return `https://www.google.com/maps/search/${encodeURIComponent(p.name)}/@${p.lat},${p.lng},18z`
}

export function osmEditUrl(p: Place): string | null {
  const m = /^osm:(node|way|relation)\/(\d+)$/.exec(p.key)
  return m ? `https://www.openstreetmap.org/${m[1]}/${m[2]}` : null
}
