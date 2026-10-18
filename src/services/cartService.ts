import { initialCarts } from '../data/initialCarts'
import { REPORT_BASE_POINTS, REPORT_GPS_BONUS } from '../data/rewards'
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
  ratings: 'kafe-panuy:v1:ratings',
  watches: 'kafe-panuy:v1:watches',
  owners: 'kafe-panuy:v1:owners',
} as const

const LEGACY_KEYS = ['kafe-panuy:v1:carts']

const STARTING_POINTS = 120
/** Carts closer than this are treated as the same place when importing */
export const DUPLICATE_RADIUS_KM = 0.04
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
    verifiedGps: false,
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

// ---------- Ratings ----------

export const RATING_POINTS = 5

/** This user's star rating per cart (1–5). */
export type MyRatings = Record<string, number>

export function getMyRatings(): MyRatings {
  const stored = read<MyRatings>(KEYS.ratings, {})
  return stored && typeof stored === 'object' ? stored : {}
}

/** Saves a rating; the first rating of a cart earns points. */
export function rateCart(cartId: string, stars: number): { ratings: MyRatings; firstTime: boolean; points: number } {
  const ratings = getMyRatings()
  const firstTime = ratings[cartId] === undefined
  const next = { ...ratings, [cartId]: Math.min(5, Math.max(1, Math.round(stars))) }
  write(KEYS.ratings, next)
  const points = firstTime ? addPoints(RATING_POINTS) : getPoints()
  return { ratings: next, firstTime, points }
}

/** Blends this user's rating into a cart's displayed average. */
export function withMyRating(cart: CoffeeCart, mine: number | undefined): CoffeeCart {
  if (mine === undefined) return cart
  const count = cart.reviewCount + 1
  const rating = Math.round(((cart.rating * cart.reviewCount + mine) / count) * 10) / 10
  return { ...cart, rating, reviewCount: count }
}

// ---------- "Notify me when it's free" ----------

export function getWatches(): string[] {
  return readList<string>(KEYS.watches)
}

export function toggleWatch(cartId: string): string[] {
  const current = getWatches()
  const next = current.includes(cartId) ? current.filter((id) => id !== cartId) : [...current, cartId]
  write(KEYS.watches, next)
  return next
}

// ---------- Owner PIN (demo) ----------
// Client-only stand-in for real owner accounts: the hashed PIN lives in this
// browser, so it shows the flow but is NOT security. Real auth needs a server.

/** cartId → hashed PIN */
type OwnerPins = Record<string, string>

export const OWNER_PIN_PATTERN = /^\d{4,6}$/

function hashPin(cartId: string, pin: string): string {
  // FNV-1a — enough to avoid storing the PIN as plain text in a demo
  let h = 0x811c9dc5
  for (const ch of `kafe-panuy:${cartId}:${pin}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export function isCartClaimed(cartId: string): boolean {
  return Boolean(read<OwnerPins>(KEYS.owners, {})[cartId])
}

export function claimCart(cartId: string, pin: string): boolean {
  if (!OWNER_PIN_PATTERN.test(pin) || isCartClaimed(cartId)) return false
  write(KEYS.owners, { ...read<OwnerPins>(KEYS.owners, {}), [cartId]: hashPin(cartId, pin) })
  return true
}

export function verifyOwnerPin(cartId: string, pin: string): boolean {
  return read<OwnerPins>(KEYS.owners, {})[cartId] === hashPin(cartId, pin)
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
  const verifiedGps = Boolean(input.verifiedGps)
  const imageBonus = input.imageUrl ? 10 : 0
  const pointsEarned = verifiedGps
    ? REPORT_BASE_POINTS + REPORT_GPS_BONUS + imageBonus
    : REPORT_BASE_POINTS + imageBonus
  const report: FieldReport = {
    ...input,
    note,
    id: makeId(),
    pointsEarned,
    verifiedGps,
    imageUrl: input.imageUrl,
    likesCount: 0,
    createdAt: now,
  }

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
          verifiedGps,
        }
      : c,
  )
  saveCarts(carts)
  write(KEYS.reports, [report, ...getReports()].slice(0, MAX_STORED))
  const points = addPoints(pointsEarned)

  return { carts, report, points, lifetimePoints: getLifetimePoints() }
}

export function likeReport(reportId: string): FieldReport[] {
  const reports = getReports().map((r) =>
    r.id === reportId ? { ...r, likesCount: (r.likesCount ?? 0) + 1 } : r,
  )
  write(KEYS.reports, reports)
  return reports
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
