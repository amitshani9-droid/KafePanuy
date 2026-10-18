import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CoffeeCart, CrowdStatus, ReportInput, Reward } from '../types/cart'
import { repo, type AppSnapshot } from '../services'
import { RATING_POINTS, withMyRating } from '../services/cartService'
import { REPORT_POINTS, rankFor } from '../data/rewards'
import { ensureNotificationPermission, showSystemNotification } from '../utils/notify'
import { cartShareUrl } from '../utils/share'
import type { Notify } from './useToast'

const EMPTY: AppSnapshot = { carts: [], points: 0, lifetimePoints: 0, reports: [], myRatings: {}, watches: [] }

/**
 * App data + every action that changes it. Talks only to `repo`, so it works the
 * same with localStorage today and a real server later. Shows toasts via `notify`.
 */
export function useKafeStore(notify: Notify) {
  const [data, setData] = useState<AppSnapshot>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    repo.load().then((snapshot) => {
      if (!alive) return
      setData(snapshot)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const patch = useCallback((p: Partial<AppSnapshot>) => setData((d) => ({ ...d, ...p })), [])

  // What every screen shows: stored carts with this user's ratings blended in
  const carts = useMemo(
    () => data.carts.map((c) => withMyRating(c, data.myRatings[c.id])),
    [data.carts, data.myRatings],
  )

  // "Notify me when it's free": fire when a watched cart turns calm
  const prevStatuses = useRef<Map<string, CrowdStatus> | null>(null)
  useEffect(() => {
    if (loading) return
    const prev = prevStatuses.current
    if (prev) {
      for (const cart of carts) {
        const before = prev.get(cart.id)
        if (data.watches.includes(cart.id) && before && before !== 'calm' && cart.status === 'calm') {
          const body = `${cart.area} · בערך ${cart.waitMinutes} דק׳ המתנה — זה הזמן לקפוץ ☕`
          void showSystemNotification(`${cart.name} התפנתה! 🟢`, body, cartShareUrl(cart.id))
          notify({ emoji: '🔔', title: `${cart.name} התפנתה!`, subtitle: body, celebrate: true })
        }
      }
    }
    prevStatuses.current = new Map(carts.map((c) => [c.id, c.status]))
  }, [carts, data.watches, loading, notify])

  const submitReport = useCallback(
    async (input: ReportInput) => {
      const prevRank = rankFor(data.lifetimePoints)
      const r = await repo.submitReport(input)
      setData((d) => ({ ...d, carts: r.carts, points: r.points, lifetimePoints: r.lifetimePoints, reports: [r.report, ...d.reports] }))
      const newRank = rankFor(r.lifetimePoints)
      const rankedUp = newRank.title !== prevRank.title
      const earned = r.report.pointsEarned ?? REPORT_POINTS
      notify({
        emoji: rankedUp ? newRank.emoji : r.report.verifiedGps ? '📍' : '🎉',
        title: rankedUp
          ? `עלית דרגה: ${newRank.title}!`
          : r.report.verifiedGps
            ? `דיווח מאומת מהשטח! קיבלת +${earned} נקודות קפה`
            : `תודה! קיבלת +${earned} נקודות קפה`,
        subtitle: rankedUp
          ? `+${earned} נק׳ על הדיווח · יש לך ${r.points} נק׳`
          : `הדיווח עודכן במפה · יש לך ${r.points} נק׳`,
        celebrate: true,
      })
    },
    [data.lifetimePoints, notify],
  )

  const rate = useCallback(
    async (cartId: string, stars: number) => {
      const r = await repo.rateCart(cartId, stars)
      patch({ myRatings: r.ratings, points: r.points, lifetimePoints: r.lifetimePoints })
      notify({
        emoji: '⭐',
        title: r.firstTime ? `תודה על הדירוג! +${RATING_POINTS} נק׳` : 'הדירוג עודכן',
        subtitle: `נתת ${stars} כוכבים`,
      })
    },
    [notify, patch],
  )

  const toggleWatch = useCallback(
    async (cart: CoffeeCart) => {
      const wasWatching = data.watches.includes(cart.id)
      patch({ watches: await repo.toggleWatch(cart.id) })
      if (wasWatching) {
        notify({ emoji: '🔕', title: 'ההתראה בוטלה' })
        return
      }
      const permission = await ensureNotificationPermission()
      notify({
        emoji: '🔔',
        title: `נודיע לך כש${cart.name} תתפנה`,
        subtitle:
          permission === 'granted'
            ? 'נשלח התראה גם כשהאפליקציה ברקע'
            : 'ההודעה תופיע כאן באפליקציה (התראות מערכת חסומות)',
      })
    },
    [data.watches, notify, patch],
  )

  const redeem = useCallback(
    async (reward: Reward) => {
      const r = await repo.redeemReward(reward)
      if (!r) return null
      patch({ points: r.points })
      return r.redemption
    },
    [patch],
  )

  const ownerUpdateStatus = useCallback(
    async (cartId: string, status: CrowdStatus, waitMinutes: number) => {
      patch({ carts: await repo.ownerUpdateStatus(cartId, status, waitMinutes) })
      notify({ emoji: '✔️', title: 'הסטטוס עודכן רשמית', subtitle: 'הלקוחות כבר רואים את זה במפה' })
    },
    [notify, patch],
  )

  const startDeal = useCallback(
    async (cartId: string, text: string, minutes: number) => {
      patch({ carts: await repo.startFlashDeal(cartId, text, minutes) })
      notify({ emoji: '🔥', title: 'הדיל באוויר!', subtitle: text, celebrate: true })
    },
    [notify, patch],
  )

  const endDeal = useCallback(
    async (cartId: string) => {
      patch({ carts: await repo.endFlashDeal(cartId) })
      notify({ emoji: '👌', title: 'המבצע הסתיים' })
    },
    [notify, patch],
  )

  /** Returns the carts actually added (duplicates are skipped). */
  const addCarts = useCallback(
    async (newCarts: CoffeeCart[]) => {
      const r = await repo.addCarts(newCarts)
      patch({ carts: r.carts })
      return r.added
    },
    [patch],
  )

  const likeReport = useCallback(
    async (reportId: string) => {
      const updatedReports = await repo.likeReport(reportId)
      patch({ reports: updatedReports })
    },
    [patch],
  )

  const reset = useCallback(async () => {
    const snapshot = await repo.reset()
    prevStatuses.current = null
    setData(snapshot)
    notify({ emoji: '🔄', title: 'נתוני הדמו אופסו', subtitle: 'הכל חזר למצב ההתחלתי' })
    return snapshot
  }, [notify])

  return {
    loading,
    carts,
    points: data.points,
    lifetimePoints: data.lifetimePoints,
    reports: data.reports,
    myRatings: data.myRatings,
    watches: data.watches,
    submitReport,
    likeReport,
    rate,
    toggleWatch,
    redeem,
    ownerUpdateStatus,
    startDeal,
    endDeal,
    addCarts,
    reset,
  }
}

export type KafeStore = ReturnType<typeof useKafeStore>
