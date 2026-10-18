import type { CoffeeCart, CrowdStatus, FieldReport, FlashDeal, Redemption, ReportInput, Reward } from '../types/cart'
import type { AppSnapshot, KafeRepository } from './repository'
import {
  addPoints,
  getLifetimePoints,
  getMyRatings,
  getPoints,
  getWatches,
  rateCart,
  redeemReward,
  resetDemoData,
  toggleWatch,
  likeReport,
  DUPLICATE_RADIUS_KM,
} from './cartService'
import { initialCarts } from '../data/initialCarts'
import { REPORT_BASE_POINTS, REPORT_GPS_BONUS } from '../data/rewards'
import { distanceKm } from './geo'

interface DbCart {
  id: string
  name: string
  aliases?: string[] | null
  area: string
  description?: string | null
  lat: number
  lng: number
  region: 'sharon' | 'north' | 'center' | 'south'
  source: 'curated' | 'osm' | 'user'
  opening_hours?: string | null
  rating?: number | null
  review_count?: number | null
  status: 'calm' | 'moderate' | 'busy'
  wait_minutes: number
  specialties?: string[] | null
  tags?: string[] | null
  last_updated: string
  data_source: 'live' | 'estimate'
  field_tags?: string[] | null
  latest_tip?: string | null
  owner_verified?: boolean | null
  verified_gps?: boolean | null
  owner_pin_hash?: string | null
}

interface DbReport {
  id: string
  cart_id: string
  status: CrowdStatus
  wait_minutes: number
  field_tags?: string[] | null
  note?: string | null
  points_earned: number
  verified_gps?: boolean | null
  created_at: string
}

interface DbFlashDeal {
  id: string
  cart_id: string
  text: string
  expires_at: string
}

function getSupabaseConfig() {
  const url =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_SUPABASE_URL || import.meta.env?.SUPABASE_URL)) ||
    ''
  const key =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env?.VITE_SUPABASE_ANON_KEY ||
        import.meta.env?.SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env?.SUPABASE_ANON_KEY)) ||
    ''
  return { url: url.replace(/\/+$/, ''), key }
}

async function sbFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  const { url, key } = getSupabaseConfig()
  if (!url || !key) return null

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(options.headers as Record<string, string> | undefined),
  }

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, { ...options, headers })
    if (!res.ok) {
      console.warn(`Supabase REST error (${res.status}): ${await res.text()}`)
      return null
    }
    if (res.status === 204) return null
    return (await res.json()) as T
  } catch (err) {
    console.warn('Supabase fetch failed:', err)
    return null
  }
}

function toCoffeeCart(db: DbCart, deal?: FlashDeal): CoffeeCart {
  return {
    id: db.id,
    name: db.name,
    aliases: db.aliases ?? undefined,
    area: db.area,
    description: db.description ?? '',
    coordinates: { lat: db.lat, lng: db.lng },
    region: db.region,
    source: db.source,
    openingHours: db.opening_hours ?? '',
    rating: db.rating ?? 0,
    reviewCount: db.review_count ?? 0,
    status: db.status,
    waitMinutes: db.wait_minutes,
    specialties: db.specialties ?? [],
    tags: (db.tags ?? []) as any,
    lastUpdated: db.last_updated,
    dataSource: db.data_source,
    fieldTags: db.field_tags ?? [],
    latestTip: db.latest_tip ?? undefined,
    ownerVerified: Boolean(db.owner_verified),
    verifiedGps: Boolean(db.verified_gps),
    flashDeal: deal,
  }
}

function toDbCart(c: CoffeeCart): Partial<DbCart> {
  return {
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    area: c.area,
    description: c.description,
    lat: c.coordinates.lat,
    lng: c.coordinates.lng,
    region: c.region,
    source: c.source,
    opening_hours: c.openingHours,
    rating: c.rating,
    review_count: c.reviewCount,
    status: c.status,
    wait_minutes: c.waitMinutes,
    specialties: c.specialties,
    tags: c.tags,
    last_updated: c.lastUpdated,
    data_source: c.dataSource,
    field_tags: c.fieldTags,
    latest_tip: c.latestTip,
    owner_verified: c.ownerVerified ?? false,
    verified_gps: c.verifiedGps ?? false,
  }
}

function hashPin(cartId: string, pin: string): string {
  let h = 0x811c9dc5
  for (const ch of `kafe-panuy:${cartId}:${pin}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/** In-memory cache for fast responsive UI */
let cachedCarts: CoffeeCart[] = []

export const supabaseRepository: KafeRepository = {
  load: async (): Promise<AppSnapshot> => {
    // 1. Fetch carts
    const dbCarts = await sbFetch<DbCart[]>('carts?select=*')
    // 2. Fetch active flash deals
    const deals = await sbFetch<DbFlashDeal[]>('flash_deals?select=*')
    const dealMap = new Map<string, FlashDeal>()
    const now = Date.now()
    if (deals) {
      for (const d of deals) {
        if (new Date(d.expires_at).getTime() > now) {
          dealMap.set(d.cart_id, { text: d.text, expiresAt: d.expires_at })
        }
      }
    }

    // Fallback to initialCarts if database is empty or unreachable
    if (!dbCarts || dbCarts.length === 0) {
      cachedCarts = initialCarts
    } else {
      cachedCarts = dbCarts.map((c) => toCoffeeCart(c, dealMap.get(c.id)))
    }

    // 3. Fetch reports
    const dbReports = await sbFetch<DbReport[]>('crowd_reports?select=*&order=created_at.desc&limit=50')
    const reports: FieldReport[] = (dbReports ?? []).map((r) => ({
      id: r.id,
      cartId: r.cart_id,
      status: r.status,
      waitMinutes: r.wait_minutes,
      fieldTags: r.field_tags ?? [],
      note: r.note ?? undefined,
      pointsEarned: r.points_earned,
      verifiedGps: Boolean(r.verified_gps),
      createdAt: r.created_at,
    }))

    return {
      carts: cachedCarts,
      points: getPoints(),
      lifetimePoints: getLifetimePoints(),
      reports,
      myRatings: getMyRatings(),
      watches: getWatches(),
    }
  },

  reset: async (): Promise<AppSnapshot> => {
    resetDemoData()
    cachedCarts = initialCarts
    return {
      carts: initialCarts,
      points: getPoints(),
      lifetimePoints: getLifetimePoints(),
      reports: [],
      myRatings: {},
      watches: [],
    }
  },

  submitReport: async (input: ReportInput) => {
    const now = new Date().toISOString()
    const verifiedGps = Boolean(input.verifiedGps)
    const pointsEarned = verifiedGps ? REPORT_BASE_POINTS + REPORT_GPS_BONUS : REPORT_BASE_POINTS
    const reportId = `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

    // 1. Insert report
    await sbFetch('crowd_reports', {
      method: 'POST',
      body: JSON.stringify({
        id: reportId,
        cart_id: input.cartId,
        status: input.status,
        wait_minutes: input.waitMinutes,
        field_tags: input.fieldTags,
        note: input.note || null,
        points_earned: pointsEarned,
        verified_gps: verifiedGps,
        created_at: now,
      }),
    })

    // 2. Update cart
    await sbFetch(`carts?id=eq.${encodeURIComponent(input.cartId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: input.status,
        wait_minutes: input.waitMinutes,
        last_updated: now,
        data_source: 'live',
        field_tags: input.fieldTags,
        latest_tip: input.note || null,
        owner_verified: false,
        verified_gps: verifiedGps,
      }),
    })

    // Update local cache
    cachedCarts = cachedCarts.map((c) =>
      c.id === input.cartId
        ? {
            ...c,
            status: input.status,
            waitMinutes: input.waitMinutes,
            lastUpdated: now,
            dataSource: 'live' as const,
            fieldTags: input.fieldTags.length > 0 ? input.fieldTags : c.fieldTags,
            latestTip: input.note ?? c.latestTip,
            ownerVerified: false,
            verifiedGps,
          }
        : c,
    )

    const report: FieldReport = {
      id: reportId,
      cartId: input.cartId,
      status: input.status,
      waitMinutes: input.waitMinutes,
      fieldTags: input.fieldTags,
      note: input.note,
      pointsEarned,
      verifiedGps,
      createdAt: now,
    }

    const points = addPoints(pointsEarned)
    return { carts: cachedCarts, report, points, lifetimePoints: getLifetimePoints() }
  },

  likeReport: async (reportId: string): Promise<FieldReport[]> => {
    return likeReport(reportId)
  },

  rateCart: async (cartId: string, stars: number) => {
    const result = rateCart(cartId, stars)
    return { ...result, lifetimePoints: getLifetimePoints() }
  },

  toggleWatch: async (cartId: string) => toggleWatch(cartId),

  redeemReward: async (reward: Reward): Promise<{ redemption: Redemption; points: number } | null> =>
    redeemReward(reward),

  addCarts: async (newCarts: CoffeeCart[]) => {
    const existing = cachedCarts
    const ids = new Set(existing.map((c) => c.id))
    const added: CoffeeCart[] = []

    for (const cart of newCarts) {
      if (ids.has(cart.id)) continue
      const tooClose = [...existing, ...added].some(
        (c) => distanceKm(c.coordinates, cart.coordinates) < DUPLICATE_RADIUS_KM,
      )
      if (tooClose) continue
      added.push(cart)
      ids.add(cart.id)
    }

    if (added.length > 0) {
      await sbFetch('carts', {
        method: 'POST',
        body: JSON.stringify(added.map(toDbCart)),
      })
      cachedCarts = [...cachedCarts, ...added]
    }

    return { carts: cachedCarts, added }
  },

  isCartClaimed: async (cartId: string): Promise<boolean> => {
    const rows = await sbFetch<{ owner_pin_hash?: string | null }[]>(
      `carts?id=eq.${encodeURIComponent(cartId)}&select=owner_pin_hash`,
    )
    return Boolean(rows && rows[0]?.owner_pin_hash)
  },

  claimCart: async (cartId: string, pin: string): Promise<boolean> => {
    const hash = hashPin(cartId, pin)
    const res = await sbFetch(`carts?id=eq.${encodeURIComponent(cartId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner_pin_hash: hash }),
    })
    return res !== null
  },

  verifyOwnerPin: async (cartId: string, pin: string): Promise<boolean> => {
    const rows = await sbFetch<{ owner_pin_hash?: string | null }[]>(
      `carts?id=eq.${encodeURIComponent(cartId)}&select=owner_pin_hash`,
    )
    return rows ? rows[0]?.owner_pin_hash === hashPin(cartId, pin) : false
  },

  ownerUpdateStatus: async (cartId: string, status: CrowdStatus, waitMinutes: number): Promise<CoffeeCart[]> => {
    const now = new Date().toISOString()
    await sbFetch(`carts?id=eq.${encodeURIComponent(cartId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        wait_minutes: waitMinutes,
        last_updated: now,
        data_source: 'live',
        owner_verified: true,
        verified_gps: false,
      }),
    })

    cachedCarts = cachedCarts.map((c) =>
      c.id === cartId
        ? { ...c, status, waitMinutes, lastUpdated: now, dataSource: 'live' as const, ownerVerified: true, verifiedGps: false }
        : c,
    )
    return cachedCarts
  },

  startFlashDeal: async (cartId: string, text: string, durationMinutes: number): Promise<CoffeeCart[]> => {
    const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString()
    const flashDeal: FlashDeal = { text: text.trim(), expiresAt }

    await sbFetch('flash_deals', {
      method: 'POST',
      body: JSON.stringify({ cart_id: cartId, text: text.trim(), expires_at: expiresAt }),
    })

    cachedCarts = cachedCarts.map((c) => (c.id === cartId ? { ...c, flashDeal } : c))
    return cachedCarts
  },

  endFlashDeal: async (cartId: string): Promise<CoffeeCart[]> => {
    await sbFetch(`flash_deals?cart_id=eq.${encodeURIComponent(cartId)}`, {
      method: 'DELETE',
    })

    cachedCarts = cachedCarts.map((c) => (c.id === cartId ? { ...c, flashDeal: undefined } : c))
    return cachedCarts
  },
}
