import * as store from './cartService'
import type { AppSnapshot, KafeRepository } from './repository'

function snapshot(): AppSnapshot {
  return {
    carts: store.getCarts(),
    points: store.getPoints(),
    lifetimePoints: store.getLifetimePoints(),
    reports: store.getReports(),
    myRatings: store.getMyRatings(),
    watches: store.getWatches(),
  }
}

/** Browser-only implementation: everything lives in localStorage (see cartService.ts). */
export const localRepository: KafeRepository = {
  load: async () => snapshot(),

  reset: async () => {
    store.resetDemoData()
    return snapshot()
  },

  submitReport: async (input) => store.submitReport(input),
  likeReport: async (reportId) => store.likeReport(reportId),

  rateCart: async (cartId, stars) => {
    const result = store.rateCart(cartId, stars)
    return { ...result, lifetimePoints: store.getLifetimePoints() }
  },

  toggleWatch: async (cartId) => store.toggleWatch(cartId),
  redeemReward: async (reward) => store.redeemReward(reward),
  addCarts: async (carts) => store.addCarts(carts),

  isCartClaimed: async (cartId) => store.isCartClaimed(cartId),
  claimCart: async (cartId, pin) => store.claimCart(cartId, pin),
  verifyOwnerPin: async (cartId, pin) => store.verifyOwnerPin(cartId, pin),
  ownerUpdateStatus: async (cartId, status, waitMinutes) => store.ownerUpdateStatus(cartId, status, waitMinutes),
  startFlashDeal: async (cartId, text, minutes) => store.startFlashDeal(cartId, text, minutes),
  endFlashDeal: async (cartId) => store.endFlashDeal(cartId),
}
