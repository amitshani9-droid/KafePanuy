import { initialCarts } from '../data/initialCarts'
import { REPORT_POINTS } from '../data/rewards'
import { distanceKm } from './geo'
import type { CoffeeCart, CrowdStatus, FieldReport, FlashDeal, Redemption, ReportInput, Reward } from '../types/cart'

const KEYS = {
  // v2: nationwide dataset — v1 held the old Emek Hefer-only seed
  carts: 'kafe-panuy:v2:carts',
  points: 'kafe-panuy:v1:points',
  lifetimePoints: 'kafe-panuy:v1:lifetime-points',
  reports: 'kafe-panuy:v1:reports',
  redemptions: 'kafe-panuy:v1:redemptions',
  ownerCart: 'kafe-panuy:v1:owner-cart',
} as const

const LEGACY_KEYS = ['kafe-panuy:v1:carts']

const STARTING_POINTS = 120
/** Carts closer than this are treated as the same place when importing */
const DUPLICATE_RADIUS_KM = 0.04
const MAX_STORED = 50

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked (private mode) — app keeps working in memory
  }
}

function readNumber(key: string, fallback: number): number {
  const n = read<number>(key, fallback)
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function readList<T>(key: string): T[] {
  const stored = read<T[]>(key, [])
  return Array.isArray(stored) ? stored : []
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------- Carts ----------

export function getCarts(): CoffeeCart[] {
  const stored = read<CoffeeCart[] | null>(KEYS.carts, null)
  if (!Array.isArray(stored) || stored.length === 0) return initialCarts
  // Merge onto seed so carts saved by an older version pick up newly added fields
  const seedIds = new Set(initialCarts.map((c) => c.id))
  const curated = initialCarts.map((seed) => ({ ...seed, ...stored.find((c) => c.id === seed.id) }))
  const extras = stored.filter((c) => !seedIds.has(c.id) && (c.source === 'osm' || c.source === 'user'))
  return [...curated, ...extras]
}

/**
 * Adds imported / user-created carts, skipping ids we already have and
 * anything within ~40 m of an existing cart (same place, different source).
 */
export function addCarts(newCarts: CoffeeCart[]): { carts: CoffeeCart[]; added: CoffeeCart[] } {
  const carts = getCarts()
  const ids = new Set(carts.map((c) => c.id))
  const added: CoffeeCart[] = []
  for (const cart of newCarts) {
    if (ids.has(cart.id)) continue
    const tooClose = [...carts, ...added].some((c) => distanceKm(c.coordinates, cart.coordinates) < DUPLICATE_RADIUS_KM)
    if (tooClose) continue
    added.push(cart)
    ids.add(cart.id)
  }
  if (added.length > 0) saveCarts([...carts, ...added])
  return { carts: added.length > 0 ? [...carts, ...added] : carts, added }
}

export function makeCartId(prefix: string): string {
  return `${prefix}-${makeId()}`
}

export function saveCarts(carts: CoffeeCart[]): void {
  write(KEYS.carts, carts)
}

// ---------- Points ----------

export function getPoints(): number {
  return readNumber(KEYS.points, STARTING_POINTS)
}

/** Total ever earned — drives rank, unaffected by redeeming. */
export function getLifetimePoints(): number {
  return readNumber(KEYS.lifetimePoints, STARTING_POINTS)
}

export function addPoints(amount: number): number {
  const next = getPoints() + amount
  write(KEYS.points, next)
  write(KEYS.lifetimePoints, getLifetimePoints() + amount)
  return next
}

function updateCart(cartId: string, patch: (c: CoffeeCart) => Partial<CoffeeCart>): CoffeeCart[] {
  const carts = getCarts().map((c) => (c.id === cartId ? { ...c, ...patch(c) } : c))
  saveCarts(carts)
  return carts
}

// ---------- Cart owner (B2B) ----------

/** Official status from the cart owner — shown with a verified badge. */
export function ownerUpdateStatus(cartId: string, status: CrowdStatus, waitMinutes: number): CoffeeCart[] {
  return updateCart(cartId, () => ({
    status,
    waitMinutes,
    lastUpdated: new Date().toISOString(),
    dataSource: 'live',
    ownerVerified: true,
  }))
}

export function startFlashDeal(cartId: string, text: string, durationMinutes: number): CoffeeCart[] {
  const flashDeal: FlashDeal = {
    text: text.trim(),
    expiresAt: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
  }
  return updateCart(cartId, () => ({ flashDeal }))
}

export function endFlashDeal(cartId: string): CoffeeCart[] {
  return updateCart(cartId, () => ({ flashDeal: undefined }))
}

export function isDealActive(cart: CoffeeCart, now = Date.now()): boolean {
  return !!cart.flashDeal && new Date(cart.flashDeal.expiresAt).getTime() > now
}

/** Last cart picked in the owner dashboard (per-browser convenience). */
export function getOwnerCartId(): string | null {
  return read<string | null>(KEYS.ownerCart, null)
}

export function setOwnerCartId(cartId: string): void {
  write(KEYS.ownerCart, cartId)
}

// ---------- Demo ----------

/** Wipes everything this app stored, back to the seed data. */
export function resetDemoData(): void {
  try {
    for (const k of [...Object.values(KEYS), ...LEGACY_KEYS]) localStorage.removeItem(k)
  } catch {
    // storage blocked — nothing persisted anyway
  }
}

// ---------- Field reports ----------

export function getReports(): FieldReport[] {
  return readList<FieldReport>(KEYS.reports)
}

export interface ReportResult {
  carts: CoffeeCart[]
  report: FieldReport
  points: number
  lifetimePoints: number
}

/** Applies a live report to its cart, stores it, and awards points. */
export function submitReport(input: ReportInput): ReportResult {
  const now = new Date().toISOString()
  const note = input.note?.trim() || undefined
  const report: FieldReport = { ...input, note, id: makeId(), pointsEarned: REPORT_POINTS, createdAt: now }

  const carts = getCarts().map((c) =>
    c.id === input.cartId
      ? {
          ...c,
          status: input.status,
          waitMinutes: input.waitMinutes,
          lastUpdated: now,
          dataSource: 'live' as const,
          fieldTags: input.fieldTags.length > 0 ? input.fieldTags : c.fieldTags,
          latestTip: note ?? c.latestTip,
          ownerVerified: false,
        }
      : c,
  )
  saveCarts(carts)
  write(KEYS.reports, [report, ...getReports()].slice(0, MAX_STORED))
  const points = addPoints(REPORT_POINTS)

  return { carts, report, points, lifetimePoints: getLifetimePoints() }
}

// ---------- Rewards ----------

export function getRedemptions(): Redemption[] {
  return readList<Redemption>(KEYS.redemptions)
}

function couponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `KP-${pick(4)}-${pick(3)}`
}

/** Deducts points and returns a coupon, or null if the balance is too low. */
export function redeemReward(reward: Reward): { redemption: Redemption; points: number } | null {
  const balance = getPoints()
  if (balance < reward.cost) return null

  const redemption: Redemption = {
    id: makeId(),
    rewardId: reward.id,
    code: couponCode(),
    createdAt: new Date().toISOString(),
  }
  const points = balance - reward.cost
  write(KEYS.points, points)
  write(KEYS.redemptions, [redemption, ...getRedemptions()].slice(0, MAX_STORED))
  return { redemption, points }
}
