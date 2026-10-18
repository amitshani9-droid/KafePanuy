import { useEffect, useState } from 'react'
import { ArrowRight, Clock, Gift, ScanLine } from 'lucide-react'
import type { CoffeeCart, FieldReport, Redemption, Reward } from '../types/cart'
import { REWARDS, rankFor } from '../data/rewards'
import { STATUS_META } from '../data/filters'
import { timeAgo } from '../utils/time'
import Modal from './Modal'
import FakeQrCode from './FakeQrCode'

interface WalletProps {
  points: number
  lifetimePoints: number
  reports: FieldReport[]
  carts: CoffeeCart[]
  onRedeem: (reward: Reward) => Promise<Redemption | null>
}

interface RewardsModalProps extends WalletProps {
  onClose: () => void
}

const COUPON_VALID_MIN = 15

function CouponView({ reward, redemption, onBack }: { reward: Reward; redemption: Redemption; onBack: () => void }) {
  const expiresAt = new Date(redemption.createdAt).getTime() + COUPON_VALID_MIN * 60_000
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const left = Math.max(0, expiresAt - now)
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')

  return (
    <div className="pt-2">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D1B13] via-[#3A2418] to-[#4A2D1F] text-cream shadow-[0_16px_40px_rgba(58,36,24,0.25)] ring-1 ring-[#C8772C]/30">
        <div className="px-5 pt-5 pb-4 text-center">
          <div className="text-4xl" aria-hidden="true">{reward.emoji}</div>
          <div className="mt-1 font-display text-2xl font-bold text-white">{reward.title}</div>
          <div className="mt-0.5 text-sm text-cream/80">{reward.description}</div>
        </div>

        {/* Perforated divider */}
        <div className="relative flex items-center" aria-hidden="true">
          <span className="absolute -start-3 h-6 w-6 rounded-full bg-cream ring-1 ring-forest/10" />
          <span className="mx-4 flex-1 border-t-2 border-dashed border-[#C8772C]/40" />
          <span className="absolute -end-3 h-6 w-6 rounded-full bg-cream ring-1 ring-forest/10" />
        </div>

        <div className="flex flex-col items-center px-5 pt-4 pb-5">
          <div className="rounded-2xl bg-white p-3 shadow-inner ring-4 ring-white/10">
            <FakeQrCode value={redemption.code} />
          </div>
          <div dir="ltr" className="mt-3 font-display text-2xl font-black tracking-[0.25em] text-[#F6EFE4]">
            {redemption.code}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-cream/80">
            <ScanLine size={15} className="text-[#DDA776]" />
            הציגו את המסך לבריסטה בעגלה לקבלת ההטבה
          </div>
          <div
            className={`mt-3 flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
              left > 0 ? 'bg-[#2F9E6A]/20 text-[#A3E5C2] ring-1 ring-[#2F9E6A]/30' : 'bg-busy/20 text-busy ring-1 ring-busy/30'
            }`}
          >
            <Clock size={14} />
            {left > 0 ? (
              <span>
                בתוקף עוד <span dir="ltr" className="font-display font-black">{mm}:{ss}</span>
              </span>
            ) : (
              'פג תוקף'
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3 text-sm font-bold text-forest ring-1 ring-forest/15 hover:bg-oat active:scale-95 transition"
      >
        <ArrowRight size={16} />
        חזרה לארנק
      </button>
    </div>
  )
}

/** Points, rank, rewards catalog and recent reports — a phone tab or the desktop modal. */
export function WalletContent({ points, lifetimePoints, reports, carts, onRedeem }: WalletProps) {
  const [coupon, setCoupon] = useState<{ reward: Reward; redemption: Redemption } | null>(null)
  const rank = rankFor(lifetimePoints)
  const progress = rank.next ? Math.min(1, (lifetimePoints - rank.min) / (rank.next.min - rank.min)) : 1
  const cartName = (id: string) => carts.find((c) => c.id === id)?.name ?? 'עגלה'

  async function redeem(reward: Reward) {
    const redemption = await onRedeem(reward)
    if (redemption) setCoupon({ reward, redemption })
  }

  return coupon ? (
        <div>
          <h3 className="mb-2 font-display text-lg font-bold text-forest">הקופון שלך מוכן 🎉</h3>
          <CouponView reward={coupon.reward} redemption={coupon.redemption} onBack={() => setCoupon(null)} />
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {/* Balance + rank (VIP Café Member Card) */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D1B13] via-[#3A2418] to-[#4F2F1E] p-5 text-cream shadow-[0_12px_36px_rgba(58,36,24,0.22)] ring-1 ring-[#C8772C]/30">
            {/* Subtle background luxury stamp */}
            <div className="pointer-events-none absolute -bottom-8 -end-8 font-display text-8xl font-black text-white/[0.04] select-none">
              ☕
            </div>
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium tracking-wide text-cream/70">מועדון קפה פנוי VIP</div>
                <div className="mt-0.5 font-display text-2xl font-bold text-white flex items-center gap-2">
                  <span>{rank.title}</span>
                  <span className="text-xl">{rank.emoji}</span>
                </div>
              </div>
              <div className="text-end">
                <div className="font-display text-4xl font-extrabold leading-none text-[#F6EFE4] tracking-tight">{points}</div>
                <div className="mt-1 text-xs font-semibold text-[#DDA776]">נקודות זמינות</div>
              </div>
            </div>
            <div className="relative z-10 mt-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-black/30 p-0.5 ring-1 ring-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C8772C] to-[#E59E58] shadow-[0_0_8px_rgba(200,119,44,0.6)] transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-cream/80">
                <span>
                  {rank.next
                    ? `עוד ${rank.next.min - lifetimePoints} נק׳ לדרגת ${rank.next.title} ${rank.next.emoji}`
                    : 'הגעת לפסגה — אגדה אמיתית! 👑'}
                </span>
                <span className="font-display text-[11px] font-bold text-[#DDA776]">{Math.round(progress * 100)}%</span>
              </div>
            </div>
          </section>

          {/* Rewards catalog */}
          <section>
            <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-forest">
              <Gift size={16} />
              מימוש הטבות בעגלות
            </h3>
            <ul className="space-y-2.5">
              {REWARDS.map((reward) => {
                const affordable = points >= reward.cost
                return (
                  <li
                    key={reward.id}
                    className="flex items-center gap-3 rounded-3xl bg-surface p-3.5 shadow-[0_4px_16px_rgba(58,36,24,0.04)] ring-1 ring-forest/10"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-oat/90 text-2xl shadow-inner ring-1 ring-forest/10"
                      aria-hidden="true"
                    >
                      {reward.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink">{reward.title}</div>
                      <div className="text-xs font-bold text-espresso">
                        <span className="font-display text-sm">{reward.cost}</span> נקודות
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => redeem(reward)}
                      disabled={!affordable}
                      className="shrink-0 rounded-2xl bg-gradient-to-r from-espresso to-espresso-dark px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all duration-150 hover:brightness-105 active:scale-90 disabled:bg-forest/10 disabled:text-forest/40 disabled:from-transparent disabled:to-transparent disabled:shadow-none"
                    >
                      {affordable ? 'ממש הטבה' : `חסרות ${reward.cost - points}`}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Recent reports */}
          <section>
            <h3 className="mb-2.5 text-sm font-bold text-forest">הדיווחים האחרונים שלך</h3>
            {reports.length === 0 ? (
              <p className="rounded-2xl bg-surface p-4 text-center text-sm text-ink/60 ring-1 ring-forest/10">
                עוד לא דיווחת 🙂 נמצא/ת ליד עגלה? דווח/י מצב וקבל/י +15 נק׳
              </p>
            ) : (
              <ul className="divide-y divide-forest/5 rounded-2xl bg-surface ring-1 ring-forest/10">
                {reports.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[r.status].bgClass}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-ink">{cartName(r.cartId)}</div>
                      <div className="text-xs text-ink/50">
                        {STATUS_META[r.status].label} · {r.waitMinutes} דק׳ · {timeAgo(r.createdAt)}
                      </div>
                    </div>
                    <span className="shrink-0 font-display font-bold text-calm">+{r.pointsEarned}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )
}

export default function RewardsModal({ onClose, ...wallet }: RewardsModalProps) {
  return (
    <Modal onClose={onClose} title="ארנק נקודות הקפה ☕">
      <WalletContent {...wallet} />
    </Modal>
  )
}
