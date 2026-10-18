import type { CoffeeCart, FilterTag } from '../types/cart'
import { regionForLatLng } from '../data/regions'
import { statusForWait } from '../data/rewards'
import { estimateWaitNow } from '../utils/forecast'
import { getDistanceKm } from '../utils/recommendations'

/** Production: same-origin Netlify proxies only (see public/_redirects) — never cross-origin, so no CORS errors. */
const PROXY_ENDPOINTS = [
  '/api/overpass-kumi/interpreter',
  '/api/overpass/interpreter',
  '/api/overpass-coffee/interpreter',
]
/** Local dev has no Netlify proxy; these mirrors send CORS headers on success. */
const DIRECT_ENDPOINTS = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter']

/** Overpass is a shared free service — keep searches to roughly city-sized areas. */
export const MAX_SEARCH_DIAGONAL_KM = 45
const MAX_RESULTS = 250
/** Per-mirror timeout. Netlify cuts proxied requests at ~26s, so stay under it. */
const TIMEOUT_MS = 20_000
/** One full retry pass after a short backoff, as Overpass asks when at capacity */
const RETRY_DELAYS_MS = [3_000]

export interface MapBounds {
  south: number
  west: number
  north: number
  east: number
}

export type OsmErrorKind = 'too-large' | 'busy' | 'timeout' | 'network'

export class OsmSearchError extends Error {
  constructor(public kind: OsmErrorKind) {
    super(kind)
  }
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function boundsDiagonalKm(b: MapBounds): number {
  return getDistanceKm(b.south, b.west, b.north, b.east)
}

function buildQuery({ south, west, north, east }: MapBounds): string {
  const bbox = `${south},${west},${north},${east}`
  return `[out:json][timeout:18];nwr["amenity"="cafe"](${bbox});out center ${MAX_RESULTS};`
}

function tagsFromOsm(t: Record<string, string>): FilterTag[] {
  const tags: FilterTag[] = []
  if (t.dog === 'yes' || t.dog === 'leashed') tags.push('dogs')
  if (['yes', 'only'].includes(t['diet:vegan']) || t['diet:gluten_free'] === 'yes') tags.push('vegan')
  if (t.outdoor_seating === 'yes' && t.covered === 'yes') tags.push('shaded')
  return tags
}

const OSM_DAYS: Record<string, string> = { Su: 'א׳', Mo: 'ב׳', Tu: 'ג׳', We: 'ד׳', Th: 'ה׳', Fr: 'ו׳', Sa: 'ש׳' }

/** "Su-Th 09:00-23:00; Fr 08:30-15:00" → "א׳–ה׳ 09:00–23:00 · ו׳ 08:30–15:00" */
export function formatOpeningHours(raw: string | undefined): string {
  if (!raw) return 'שעות פתיחה לא ידועות'
  if (raw.trim() === '24/7') return 'פתוח 24/7'
  return raw
    .replace(/\b(Su|Mo|Tu|We|Th|Fr|Sa)\b/g, (d) => OSM_DAYS[d])
    .replace(/\boff\b/g, 'סגור')
    .replace(/(\d)-(\d)/g, '$1–$2')
    .replace(/(׳)-(?=[א-ת])/g, '$1–')
    .replace(/\s*;\s*/g, ' · ')
}

function areaFromOsm(t: Record<string, string>): string {
  const city = t['addr:city:he'] ?? t['addr:city']
  const street = t['addr:street:he'] ?? t['addr:street']
  const parts = [street && [street, t['addr:housenumber']].filter(Boolean).join(' '), city].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'מתוך OpenStreetMap'
}

function toCart(el: OverpassElement, now: Date): CoffeeCart | null {
  const t = el.tags ?? {}
  const name = t['name:he'] ?? t.name
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (!name || lat === undefined || lng === undefined) return null

  const waitMinutes = estimateWaitNow(now)
  const coordinates = { lat, lng }
  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    area: areaFromOsm(t),
    description: 'בית קפה מתוך OpenStreetMap — עוד אין עליו דיווחים מהשטח. נמצאים שם? דווחו ותעזרו לכל מי שבדרך ☕',
    coordinates,
    region: regionForLatLng(coordinates),
    source: 'osm',
    openingHours: formatOpeningHours(t.opening_hours),
    rating: 0,
    reviewCount: 0,
    status: statusForWait(waitMinutes),
    waitMinutes,
    specialties: [],
    tags: tagsFromOsm(t),
    lastUpdated: now.toISOString(),
    dataSource: 'estimate',
    fieldTags: [],
  }
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/** Fetches named cafés inside the bounds from OpenStreetMap (Overpass API), retrying while it's busy. */
export async function fetchCafesInBounds(bounds: MapBounds): Promise<CoffeeCart[]> {
  if (boundsDiagonalKm(bounds) > MAX_SEARCH_DIAGONAL_KM) throw new OsmSearchError('too-large')

  const query = buildQuery(bounds)
  for (let attempt = 0; ; attempt++) {
    try {
      return await queryOverpass(query)
    } catch (err) {
      // Only retry when mirrors said "busy"; timeouts/network failures already tried every mirror
      const busy = err instanceof OsmSearchError && err.kind === 'busy'
      if (!busy || attempt >= RETRY_DELAYS_MS.length) throw err
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }
}

async function queryOverpass(query: string): Promise<CoffeeCart[]> {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const endpoints = isLocal ? DIRECT_ENDPOINTS : PROXY_ENDPOINTS

  let lastError: Error | null = null

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })

      // 429 / any 5xx (incl. Netlify's 500 when the upstream mirror is too slow) → try the next mirror
      if (res.status === 429 || res.status >= 500) {
        lastError = new OsmSearchError('busy')
        continue
      }
      if (!res.ok) {
        lastError = new OsmSearchError('network')
        continue
      }

      const data = (await res.json()) as { elements?: OverpassElement[] }
      const now = new Date()
      return (data.elements ?? []).map((el) => toCart(el, now)).filter((c): c is CoffeeCart => c !== null)
    } catch {
      lastError = new OsmSearchError(controller.signal.aborted ? 'timeout' : 'network')
      continue
    } finally {
      window.clearTimeout(timer)
    }
  }

  throw lastError ?? new OsmSearchError('network')
}
