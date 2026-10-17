import { useState, type FormEvent, type ReactNode } from 'react'
import { BadgeCheck, Flame, KeyRound, Lock, LockOpen, Store } from 'lucide-react'
import type { CoffeeCart, CrowdStatus } from '../types/cart'
import { STATUS_META } from '../data/filters'
import { MAX_REPORT_WAIT, REPORT_STATUS_OPTIONS, statusForWait } from '../data/rewards'
import { FLASH_DEAL_DURATIONS, FLASH_DEAL_MAX_LENGTH, FLASH_DEAL_PRESETS } from '../data/deals'
import {
  claimCart,
  getOwnerCartId,
  isCartClaimed,
  isDealActive,
  OWNER_PIN_PATTERN,
  setOwnerCartId,
  verifyOwnerPin,
} from '../services/cartService'
import { minutesUntil, updatedLabel } from '../utils/time'
import Modal from './Modal'
import ResetDemoButton from './ResetDemoButton'

interface OwnerDashboardModalProps {
  carts: CoffeeCart[]
  onClose: () => void
  onStatusUpdate: (cartId: string, status: CrowdStatus, waitMinutes: number) => void
  onStartDeal: (cartId: string, text: string, durationMinutes: number) => void
  onEndDeal: (cartId: string) => void
  onResetDemo: () => void
  /** Carts unlocked with their owner PIN in this session */
  unlockedIds: string[]
  onUnlock: (cartId: string) => void
  onLock: (cartId: string) => void
}

/** Claim a cart with a new PIN, or unlock it with the existing one. */
function OwnerGate({ cart, onUnlock }: { cart: CoffeeCart; onUnlock: () => void }) {
  const claimed = isCartClaimed(cart.id)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pinInput =
    'w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-center font-display text-xl tracking-[0.4em] text-ink ring-1 ring-forest/15 focus:ring-2 focus:ring-forest focus:outline-none'

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!OWNER_PIN_PATTERN.test(pin)) {
      setError('הקוד צריך להיות 4–6 ספרות')
      return
    }
    if (claimed) {
      if (verifyOwnerPin(cart.id, pin)) onUnlock()
      else {
        setError('הקוד לא נכון, נסו שוב')
        setPin('')
      }
      return
    }
    if (pin !== confirm) {
      setError('הקודים לא תואמים')
      return
    }
    if (claimCart(cart.id, pin)) onUnlock()
    else setError('לא הצלחנו לרשום את העגלה')
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-surface p-4 ring-1 ring-forest/10">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-forest">
        {claimed ? <Lock size={18} /> : <KeyRound size={18} />}
        {claimed ? 'הזינו את קוד הבעלים' : 'העגלה עוד לא רשומה — זו שלך?'}
      </h3>
      <p className="mb-3 text-sm text-ink/60">
        {claimed
          ? `רק מי שמחזיק בקוד יכול לעדכן את ${cart.name}.`
          : `צרו קוד בעלים (4–6 ספרות). רק עם הקוד אפשר יהיה לעדכן את ${cart.name}.`}
      </p>
      <div className={claimed ? '' : 'grid grid-cols-2 gap-2'} dir="ltr">
        <input
          type="password"
          inputMode="numeric"
          autoComplete={claimed ? 'current-password' : 'new-password'}
          maxLength={6}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''))
            setError(null)
          }}
          aria-label={claimed ? 'קוד בעלים' : 'קוד בעלים חדש'}
          placeholder="••••"
          className={pinInput}
        />
        {!claimed && (
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value.replace(/\D/g, ''))
              setError(null)
            }}
            aria-label="אימות הקוד"
            placeholder="שוב"
            className={pinInput}
          />
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm font-bold text-busy" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-3 w-full rounded-xl bg-forest py-3 font-display font-bold text-cream transition hover:bg-forest-light active:scale-[0.98]"
      >
        {claimed ? 'כניסה' : 'רשמו את העגלה שלי'}
      </button>
      <p className="mt-3 text-xs text-ink/50">
        🧪 מצב דמו: הקוד נשמר רק בדפדפן הזה ואינו אבטחה אמיתית. בגרסה מלאה תהיה התחברות מאובטחת דרך שרת.
      </p>
    </form>
  )
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-forest">
      {icon}
      {children}
    </h3>
  )
}

function StatusSection({ cart, onSubmit }: { cart: CoffeeCart; onSubmit: (s: CrowdStatus, w: number) => void }) {
  const [wait, setWait] = useState(cart.waitMinutes)
  const status = statusForWait(wait)

  function pick(next: CrowdStatus) {
    if (statusForWait(wait) !== next) setWait(REPORT_STATUS_OPTIONS.find((o) => o.status === next)!.defaultWait)
  }

  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-forest/10">
      <SectionTitle icon={<BadgeCheck size={18} />}>עדכון סטטוס רשמי</SectionTitle>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="מצב העומס">
        {REPORT_STATUS_OPTIONS.map((opt) => {
          const active = status === opt.status
          const meta = STATUS_META[opt.status]
          return (
            <button
              key={opt.status}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(opt.status)}
              className={`rounded-xl px-2 py-2.5 text-center transition ${
                active ? `${meta.softBgClass} ring-2 ring-current ${meta.textClass}` : 'bg-cream ring-1 ring-forest/10 hover:bg-oat'
              }`}
            >
              <span className="block text-xl" aria-hidden="true">{opt.emoji}</span>
              <span className={`block text-sm font-bold ${active ? meta.textClass : 'text-ink'}`}>{opt.label}</span>
              <span className="block text-[11px] text-ink/50">{opt.range}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={MAX_REPORT_WAIT}
          value={wait}
          onChange={(e) => setWait(Number(e.target.value))}
          aria-label="זמן המתנה בדקות"
          aria-valuetext={`${wait} דקות`}
          className="wait-slider flex-1"
        />
        <span className={`w-16 shrink-0 text-center font-display text-xl font-bold ${STATUS_META[status].textClass}`}>
          {wait} דק׳
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSubmit(status, wait)}
        className="mt-4 w-full rounded-xl bg-forest py-3 font-display font-bold text-cream transition hover:bg-forest-light active:scale-[0.98]"
      >
        עדכן סטטוס רשמי ✔️
      </button>
    </section>
  )
}

function DealSection({
  cart,
  onStart,
  onEnd,
}: {
  cart: CoffeeCart
  onStart: (text: string, minutes: number) => void
  onEnd: () => void
}) {
  const [text, setText] = useState(FLASH_DEAL_PRESETS[0])
  const [minutes, setMinutes] = useState(60)
  const active = isDealActive(cart) ? cart.flashDeal! : null

  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-forest/10">
      <SectionTitle icon={<Flame size={18} className="text-espresso" />}>מבצע בזק להבאת לקוחות כשפנוי</SectionTitle>

      {active ? (
        <div className="deal-glow rounded-2xl bg-gradient-to-bl from-espresso to-espresso-dark p-4 text-white">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="rounded-full bg-white/20 px-2 py-0.5">🔥 פעיל עכשיו במפה</span>
            <span>נגמר בעוד {minutesUntil(active.expiresAt)} דק׳</span>
          </div>
          <p className="mt-2 font-display text-lg font-bold">{active.text}</p>
          <button
            type="button"
            onClick={onEnd}
            className="mt-3 w-full rounded-xl bg-white/20 py-2 text-sm font-bold transition hover:bg-white/30"
          >
            סיים מבצע עכשיו
          </button>
        </div>
      ) : (
        <>
          {cart.status === 'busy' && (
            <p className="mb-3 rounded-xl bg-moderate/10 px-3 py-2 text-sm text-ink">
              העגלה עמוסה כרגע 😅 דילים עובדים הכי טוב כשפנוי — אבל זה בידיים שלך.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {FLASH_DEAL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={text === preset}
                onClick={() => setText(preset)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  text === preset ? 'bg-espresso text-white shadow-sm' : 'bg-cream text-ink ring-1 ring-forest/15 hover:bg-oat'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-bold text-ink/60">או כתבו דיל משלכם</span>
            <input
              type="text"
              value={text}
              maxLength={FLASH_DEAL_MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border-0 bg-cream px-3 py-2.5 text-base text-ink ring-1 ring-forest/15 focus:ring-2 focus:ring-espresso focus:outline-none"
            />
          </label>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-bold text-ink/60">למשך</span>
            <div className="flex flex-1 rounded-full bg-cream p-0.5 ring-1 ring-forest/10" role="group" aria-label="משך המבצע">
              {FLASH_DEAL_DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  type="button"
                  aria-pressed={minutes === d.minutes}
                  onClick={() => setMinutes(d.minutes)}
                  className={`flex-1 rounded-full py-1.5 text-sm font-bold transition ${
                    minutes === d.minutes ? 'bg-forest text-cream' : 'text-forest/70'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStart(text, minutes)}
            disabled={!text.trim()}
            className="mt-4 w-full rounded-xl bg-espresso py-3 font-display font-bold text-white shadow-md shadow-espresso/25 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
          >
            הפעל דיל עכשיו 🔥
          </button>
        </>
      )}
    </section>
  )
}

export default function OwnerDashboardModal({
  carts,
  onClose,
  onStatusUpdate,
  onStartDeal,
  onEndDeal,
  onResetDemo,
  unlockedIds,
  onUnlock,
  onLock,
}: OwnerDashboardModalProps) {
  const [cartId, setCartId] = useState(() => {
    const saved = getOwnerCartId()
    return carts.some((c) => c.id === saved) ? saved! : carts[0].id
  })
  const cart = carts.find((c) => c.id === cartId) ?? carts[0]
  const meta = STATUS_META[cart.status]

  function chooseCart(id: string) {
    setCartId(id)
    setOwnerCartId(id)
  }

  return (
    <Modal
      onClose={onClose}
      title={
        <>
          כניסת בעלי עגלות 🏪
          <span className="mt-0.5 block font-body text-sm font-normal text-ink/60">
            עדכנו עומס בזמן אמת והביאו לקוחות כשהעגלה פנויה
          </span>
        </>
      }
      footer={<ResetDemoButton onReset={onResetDemo} />}
    >
      <div className="space-y-4 pt-2">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink/60">
            <Store size={14} />
            איזו עגלה את/ה מנהל/ת?
          </span>
          <select
            value={cart.id}
            onChange={(e) => chooseCart(e.target.value)}
            className="w-full cursor-pointer rounded-xl border-0 bg-surface px-3 py-3 text-base font-bold text-forest ring-1 ring-forest/15 focus:ring-2 focus:ring-forest focus:outline-none"
          >
            {carts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.area}
              </option>
            ))}
          </select>
        </label>

        {/* Current snapshot */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-oat/60 px-4 py-3 text-sm">
          <span className="text-ink/60">כרגע במפה:</span>
          <span className={`rounded-full px-2.5 py-0.5 font-bold text-white ${meta.bgClass}`}>{meta.label}</span>
          <span className="font-display font-bold text-ink">{cart.waitMinutes} דק׳</span>
          <span className="text-ink/50">· {updatedLabel(cart.lastUpdated)}</span>
          {cart.ownerVerified && <BadgeCheck size={16} className="text-calm-ink" aria-label="מאומת" />}
        </div>

        {unlockedIds.includes(cart.id) ? (
          <>
            <StatusSection key={`status-${cart.id}`} cart={cart} onSubmit={(s, w) => onStatusUpdate(cart.id, s, w)} />
            <DealSection
              key={`deal-${cart.id}`}
              cart={cart}
              onStart={(text, minutes) => onStartDeal(cart.id, text, minutes)}
              onEnd={() => onEndDeal(cart.id)}
            />
            <button
              type="button"
              onClick={() => onLock(cart.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold text-forest/70 hover:bg-oat"
            >
              <LockOpen size={15} />
              נעילת העגלה
            </button>
          </>
        ) : (
          <OwnerGate key={`gate-${cart.id}`} cart={cart} onUnlock={() => onUnlock(cart.id)} />
        )}
      </div>
    </Modal>
  )
}
