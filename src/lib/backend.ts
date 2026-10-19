import type { LearnedProfile, Level, Place, PlaceKind, Report } from '../types'
import type { Bounds } from './geo'
import { deviceId, readJson, writeJson } from './storage'

/**
 * Shared data (reports + user-added places).
 * - With VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY: Supabase (free tier) via its REST RPC endpoints.
 * - Without them: this browser's localStorage only (works, but nobody else sees your reports).
 */
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as
  | string
  | undefined

const configured = Boolean(URL_ && KEY)
/** Turns false for the rest of the session if the server is configured but the schema isn't installed */
let sharedAvailable = configured

/** Whether reports currently go to the shared server (vs. this browser only) */
export function isShared(): boolean {
  return sharedAvailable
}

export type BackendErrorKind = 'rate-limited' | 'duplicate' | 'network' | 'unavailable'
export class BackendError extends Error {
  constructor(public kind: BackendErrorKind) {
    super(kind)
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
  } catch {
    throw new BackendError('network')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (text.includes('rate limited')) throw new BackendError('rate-limited')
    if (text.includes('duplicate')) throw new BackendError('duplicate')
    // PGRST202 = function not found: supabase/schema.sql hasn't been run on this project
    if (res.status === 404 || text.includes('PGRST202') || text.includes('PGRST205')) {
      if (sharedAvailable) console.warn('קפה פנוי: Supabase functions missing — run supabase/schema.sql. Using local mode.')
      sharedAvailable = false
      throw new BackendError('unavailable')
    }
    throw new BackendError('network')
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

// ---------------------------------------------------------------------------
// Local fallback store
// ---------------------------------------------------------------------------

const LOCAL_REPORTS = 'kafe-panuy:v3:reports'
const LOCAL_PLACES = 'kafe-panuy:v3:user-places'
const LOCAL_KEEP_MS = 120 * 24 * 60 * 60 * 1000

function localReports(): Report[] {
  const cutoff = Date.now() - LOCAL_KEEP_MS
  return readJson<Report[]>(LOCAL_REPORTS, []).filter((r) => r.createdAt > cutoff)
}

function localPlaces(): Place[] {
  return readJson<Place[]>(LOCAL_PLACES, [])
}

/** Build learned profiles from a list of reports (same math as get_profiles in SQL) */
export function profilesFromReports(reports: Report[]): Map<string, LearnedProfile> {
  const score: Record<Level, number> = { calm: 15, moderate: 55, busy: 90 }
  const acc = new Map<string, Map<string, { sum: number; n: number }>>()
  for (const r of reports) {
    const d = new Date(r.createdAt)
    const slot = `${d.getDay()}-${d.getHours()}`
    const slots = acc.get(r.placeKey) ?? new Map()
    const s = slots.get(slot) ?? { sum: 0, n: 0 }
    s.sum += score[r.level]
    s.n++
    slots.set(slot, s)
    acc.set(r.placeKey, slots)
  }
  const out = new Map<string, LearnedProfile>()
  for (const [placeKey, slots] of acc) {
    const profile: LearnedProfile = { placeKey, slots: {} }
    for (const [slot, s] of slots) profile.slots[slot] = { score: s.sum / s.n, n: s.n }
    out.set(placeKey, profile)
  }
  return out
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function submitReport(placeKey: string, level: Level): Promise<void> {
  if (sharedAvailable) {
    try {
      await rpc('submit_report', { p_place_key: placeKey, p_level: level, p_device: deviceId() })
      return
    } catch (e) {
      if (!(e instanceof BackendError && e.kind === 'unavailable')) throw e
    }
  }
  const now = Date.now()
  const reports = localReports()
  const recent = reports.find((r) => r.placeKey === placeKey && now - r.createdAt < 10 * 60_000)
  if (recent) {
    recent.level = level
    recent.createdAt = now
  } else {
    reports.push({ placeKey, level, createdAt: now })
  }
  writeJson(LOCAL_REPORTS, reports)
}

/** Recent reports (last 45 min) for the given places, grouped by place */
export async function fetchLiveReports(keys: string[]): Promise<Map<string, Report[]>> {
  const out = new Map<string, Report[]>()
  if (!keys.length) return out
  let list: Report[] | null = null
  if (sharedAvailable) {
    try {
      const rows = await rpc<{ place_key: string; level: Level; created_at: string }[]>('get_live_reports', {
        p_keys: keys.slice(0, 600),
      })
      list = rows.map((r) => ({ placeKey: r.place_key, level: r.level, createdAt: Date.parse(r.created_at) }))
    } catch (e) {
      if (!(e instanceof BackendError && e.kind === 'unavailable')) throw e
    }
  }
  if (!list) {
    const wanted = new Set(keys)
    const cutoff = Date.now() - 45 * 60_000
    list = localReports().filter((r) => wanted.has(r.placeKey) && r.createdAt > cutoff)
  }
  for (const r of list) out.set(r.placeKey, [...(out.get(r.placeKey) ?? []), r])
  return out
}

export async function fetchProfiles(keys: string[]): Promise<Map<string, LearnedProfile>> {
  if (!keys.length) return new Map()
  const local = () => {
    const wanted = new Set(keys)
    return profilesFromReports(localReports().filter((r) => wanted.has(r.placeKey)))
  }
  if (!sharedAvailable) return local()
  let rows: { place_key: string; dow: number; hour: number; score: number; n: number }[]
  try {
    rows = await rpc('get_profiles', { p_keys: keys.slice(0, 600) })
  } catch (e) {
    if (e instanceof BackendError && e.kind === 'unavailable') return local()
    throw e
  }
  const out = new Map<string, LearnedProfile>()
  for (const r of rows) {
    const p = out.get(r.place_key) ?? { placeKey: r.place_key, slots: {} }
    p.slots[`${r.dow}-${r.hour}`] = { score: r.score, n: r.n }
    out.set(r.place_key, p)
  }
  return out
}

export async function fetchUserPlaces(b: Bounds): Promise<Place[]> {
  const local = () =>
    localPlaces().filter((p) => p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east)
  if (!sharedAvailable) return local()
  let rows: { id: string; name: string; kind: PlaceKind; lat: number; lng: number; opening_hours: string | null }[]
  try {
    rows = await rpc('get_user_places', { p_south: b.south, p_west: b.west, p_north: b.north, p_east: b.east })
  } catch (e) {
    if (e instanceof BackendError && e.kind === 'unavailable') return local()
    throw e
  }
  return rows.map((r) => ({
    key: `user:${r.id}`,
    name: r.name,
    kind: r.kind,
    lat: r.lat,
    lng: r.lng,
    openingHours: r.opening_hours ?? undefined,
    source: 'user' as const,
  }))
}

export interface NewPlace {
  name: string
  kind: PlaceKind
  lat: number
  lng: number
  openingHours?: string
}

export async function addPlace(input: NewPlace): Promise<Place> {
  if (sharedAvailable) {
    try {
      const id = await rpc<string>('add_place', {
        p_name: input.name,
        p_kind: input.kind,
        p_lat: input.lat,
        p_lng: input.lng,
        p_device: deviceId(),
        p_opening_hours: input.openingHours ?? null,
      })
      return { key: `user:${id}`, ...input, name: input.name.trim(), source: 'user' }
    } catch (e) {
      if (!(e instanceof BackendError && e.kind === 'unavailable')) throw e
    }
  }
  const places = localPlaces()
  if (places.some((p) => Math.abs(p.lat - input.lat) < 0.0003 && Math.abs(p.lng - input.lng) < 0.0003)) {
    throw new BackendError('duplicate')
  }
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + String(Date.now()).padStart(12, '0').slice(-12)
  const place: Place = { key: `user:${id}`, ...input, name: input.name.trim(), source: 'user' }
  writeJson(LOCAL_PLACES, [...places, place])
  return place
}
