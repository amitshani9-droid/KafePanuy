import type { Place, PlaceKind } from '../types'
import { boundsContain, boundsDiagonalKm, type Bounds } from './geo'
import { readJson, writeJson } from './storage'

/**
 * Fallback only (see loadStaticPlaces below). Browsers call the public mirrors
 * directly — they send CORS headers on success. The Netlify proxy is a last
 * resort: overpass-api.de rejects it (406) and the other mirrors time out
 * behind Netlify's ~26 s proxy limit (checked 2026-10-19).
 */
const DIRECT_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const PROXY_ENDPOINTS = ['/api/overpass-kumi/interpreter']

/** Overpass is a shared free service — keep each search roughly city-sized */
export const MAX_SEARCH_KM = 40
const TIMEOUT_MS = 22_000
const CACHE_KEY = 'kafe-panuy:v3:osm-cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX_ENTRIES = 8

export type OverpassErrorKind = 'too-large' | 'busy' | 'network'
export class OverpassError extends Error {
  constructor(public kind: OverpassErrorKind) {
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

export function buildQuery(b: Bounds): string {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`
  return `[out:json][timeout:20];(
nwr["amenity"="cafe"]["name"](${bbox});
nwr["shop"="coffee"]["name"](${bbox});
nwr["amenity"~"^(fast_food|kiosk)$"]["cuisine"~"coffee"]["name"](${bbox});
nwr["street_vendor"="yes"]["cuisine"~"coffee"](${bbox});
);out center 500;`
}

const CART_NAME = /עגל|קרוואן|פודטראק|טראק|קיוסק|דוכן|cart|truck|kiosk/i

export function classify(tags: Record<string, string>): PlaceKind {
  if (tags.street_vendor === 'yes' || tags.amenity === 'kiosk' || tags.shop === 'kiosk') return 'cart'
  const name = `${tags.name ?? ''} ${tags['name:he'] ?? ''} ${tags['name:en'] ?? ''}`
  return CART_NAME.test(name) ? 'cart' : 'cafe'
}

export function parseElements(elements: OverpassElement[]): Place[] {
  const out: Place[] = []
  const seen = new Set<string>()
  for (const el of elements) {
    const t = el.tags ?? {}
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    const name = t['name:he'] || t.name || (t.street_vendor === 'yes' ? 'עגלת קפה' : '')
    if (lat == null || lng == null || !name) continue
    if (t.disused === 'yes' || t['disused:amenity']) continue
    const key = `osm:${el.type}/${el.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ')
    const address = [street, t['addr:city']].filter(Boolean).join(', ') || undefined
    out.push({
      key,
      name,
      kind: classify(t),
      lat,
      lng,
      openingHours: t.opening_hours || undefined,
      address,
      source: 'osm',
    })
  }
  return out
}

interface CacheEntry {
  bounds: Bounds
  at: number
  places: Place[]
}

function readCache(): CacheEntry[] {
  const now = Date.now()
  return readJson<CacheEntry[]>(CACHE_KEY, []).filter((e) => now - e.at < CACHE_TTL_MS)
}

/** Grow the box a bit so small pans don't trigger a new search */
function padBounds(b: Bounds, factor = 0.35): Bounds {
  const dLat = (b.north - b.south) * factor
  const dLng = (b.east - b.west) * factor
  return { south: b.south - dLat, north: b.north + dLat, west: b.west - dLng, east: b.east + dLng }
}

export function cachedPlaces(b: Bounds): Place[] | null {
  const hit = readCache().find((e) => boundsContain(e.bounds, b))
  return hit ? hit.places : null
}

async function postQuery(endpoint: string, query: string): Promise<OverpassElement[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      signal: ctrl.signal,
    })
    if (res.status === 429 || res.status === 504 || res.status === 503) throw new OverpassError('busy')
    if (!res.ok) throw new OverpassError('network')
    const json = (await res.json()) as { elements?: OverpassElement[] }
    return json.elements ?? []
  } catch (e) {
    if (e instanceof OverpassError) throw e
    throw new OverpassError('network')
  } finally {
    clearTimeout(timer)
  }
}

/** Coffee places in the given area — from cache when possible, else Overpass (tries mirrors in order). */
export async function fetchPlaces(view: Bounds): Promise<Place[]> {
  if (boundsDiagonalKm(view) > MAX_SEARCH_KM) throw new OverpassError('too-large')
  const cached = cachedPlaces(view)
  if (cached) return cached

  const bounds = boundsDiagonalKm(padBounds(view)) <= MAX_SEARCH_KM ? padBounds(view) : view
  const query = buildQuery(bounds)
  const endpoints = import.meta.env.PROD ? [...DIRECT_ENDPOINTS, ...PROXY_ENDPOINTS] : DIRECT_ENDPOINTS
  let lastError: OverpassError = new OverpassError('network')
  for (const endpoint of endpoints) {
    try {
      const places = parseElements(await postQuery(endpoint, query))
      const entries = [{ bounds, at: Date.now(), places }, ...readCache()].slice(0, CACHE_MAX_ENTRIES)
      writeJson(CACHE_KEY, entries)
      return places
    } catch (e) {
      lastError = e instanceof OverpassError ? e : new OverpassError('network')
    }
  }
  throw lastError
}

// ---------------------------------------------------------------------------
// Static dataset (public/data/places.json), built weekly from the Geofabrik
// extract by .github/workflows/places.yml. This is the primary source; the
// live Overpass search above is only a fallback when the file is missing.
// ---------------------------------------------------------------------------

type StaticRow = [string, number, number, Record<string, string>]
const TYPE_BY_CODE: Record<string, OverpassElement['type']> = { n: 'node', w: 'way', r: 'relation' }

export function parseStaticRows(rows: StaticRow[]): Place[] {
  const elements: OverpassElement[] = []
  for (const [id, lat, lng, tags] of rows) {
    const type = TYPE_BY_CODE[id[0]]
    const num = Number(id.slice(1))
    if (!type || !Number.isFinite(num)) continue
    elements.push({ type, id: num, lat, lon: lng, tags })
  }
  return parseElements(elements)
}

let staticPromise: Promise<Place[] | null> | null = null

/** All coffee places in Israel from the bundled dataset; null if it isn't available */
export function loadStaticPlaces(): Promise<Place[] | null> {
  if (!staticPromise) {
    staticPromise = fetch('/data/places.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { places?: StaticRow[] } | null) => {
        const list = d?.places ? parseStaticRows(d.places) : []
        return list.length ? list : null
      })
      .catch(() => null)
  }
  return staticPromise
}
