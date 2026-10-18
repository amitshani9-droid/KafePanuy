import type { CoffeeCart, CrowdStatus, FieldReport, Redemption, ReportInput, Reward } from '../types/cart'
import type { MyRatings } from './cartService'

/** Everything the app needs on startup. */
export interface AppSnapshot {
  carts: CoffeeCart[]
  points: number
  lifetimePoints: number
  reports: FieldReport[]
  myRatings: MyRatings
  watches: string[]
}

export interface PointsUpdate {
  points: number
  lifetimePoints: number
}

/**
 * The app's single data boundary. Screens and hooks only talk to this interface,
 * so swapping localStorage for a real backend (Supabase, Firebase, …) means
 * writing one new implementation — no UI changes.
 * Every method is async because a server-backed version will be.
 */
export interface KafeRepository {
  load(): Promise<AppSnapshot>
  reset(): Promise<AppSnapshot>

  submitReport(input: ReportInput): Promise<{ carts: CoffeeCart[]; report: FieldReport } & PointsUpdate>
  likeReport(reportId: string): Promise<FieldReport[]>
  rateCart(cartId: string, stars: number): Promise<{ ratings: MyRatings; firstTime: boolean } & PointsUpdate>
  toggleWatch(cartId: string): Promise<string[]>
  redeemReward(reward: Reward): Promise<{ redemption: Redemption; points: number } | null>

  /** Adds imported / user-created carts, skipping duplicates. */
  addCarts(carts: CoffeeCart[]): Promise<{ carts: CoffeeCart[]; added: CoffeeCart[] }>

  // Cart owners
  isCartClaimed(cartId: string): Promise<boolean>
  claimCart(cartId: string, pin: string): Promise<boolean>
  verifyOwnerPin(cartId: string, pin: string): Promise<boolean>
  ownerUpdateStatus(cartId: string, status: CrowdStatus, waitMinutes: number): Promise<CoffeeCart[]>
  startFlashDeal(cartId: string, text: string, durationMinutes: number): Promise<CoffeeCart[]>
  endFlashDeal(cartId: string): Promise<CoffeeCart[]>
}
