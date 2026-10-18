import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Send, X } from 'lucide-react'
import type { CoffeeCart, CrowdStatus, LatLng, ReportInput } from '../types/cart'
import {
  MAX_REPORT_WAIT,
  REPORT_BASE_POINTS,
  REPORT_FIELD_TAGS,
  REPORT_GPS_BONUS,
  REPORT_STATUS_OPTIONS,
  statusForWait,
} from '../data/rewards'
import { STATUS_META } from '../data/filters'
import { distanceKm, GPS_VERIFICATION_RADIUS_KM, requestUserLocation } from '../services/geo'
import Modal from './Modal'

interface ReportModalProps {
  cart: CoffeeCart
  userLocation?: LatLng | null
  onClose: () => void
  onSubmit: (input: ReportInput) => void
}

const NOTE_MAX = 120

function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-forest">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest font-display text-xs text-cream">
        {n}
      </span>
      {children}
    </h3>
  )
}

export default function ReportModal({ cart, userLocation, onClose, onSubmit }: ReportModalProps) {
  const [userCoords, setUserCoords] = useState<LatLng | null>(userLocation ?? null)
  const [status, setStatus] = useState<CrowdStatus | null>(null)
  const [wait, setWait] = useState(cart.waitMinutes)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (userLocation) {
      setUserCoords(userLocation)
      return
    }
    let alive = true
    requestUserLocation()
      .then((loc) => {
        if (alive) setUserCoords(loc)
      })
      .catch(() => {
        // Geolocation denied or unavailable
      })
    return () => {
      alive = false
    }
  }, [userLocation])

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isGpsVerified = useMemo(() => {
    if (!userCoords) return false
    return distanceKm(userCoords, cart.coordinates) <= GPS_VERIFICATION_RADIUS_KM
  }, [userCoords, cart.coordinates])

  const photoBonus = imageUrl ? 10 : 0
  const pointsToAward =
    (isGpsVerified ? REPORT_BASE_POINTS + REPORT_GPS_BONUS : REPORT_BASE_POINTS) + photoBonus

  function pickStatus(next: CrowdStatus) {
    setStatus(next)
    // Keep the slider inside the chosen range
    if (statusForWait(wait) !== next) {
      setWait(REPORT_STATUS_OPTIONS.find((o) => o.status === next)!.defaultWait)
    }
  }

  function changeWait(min: number) {
    setWait(min)
    setStatus(statusForWait(min))
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  function submit() {
    if (!status) return
    onSubmit({
      cartId: cart.id,
      status,
      waitMinutes: wait,
      fieldTags: tags,
      note,
      verifiedGps: isGpsVerified,
      imageUrl: imageUrl ?? undefined,
    })
  }

  const effectiveStatus = status ?? statusForWait(wait)

  return (
    <Modal
      onClose={onClose}
      title={
        <>
          מה המצב ב{cart.name}?
          <span className="mt-0.5 block font-body text-sm font-normal text-ink/60">
            הדיווח שלך עוזר לכל מי שבדרך ☕
          </span>
        </>
      }
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={!status}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-espresso py-3.5 font-display text-base font-bold text-white shadow-md transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Send size={18} />
          {status ? `שלח דיווח (+${pointsToAward} נק׳)` : 'בחרו קודם כמה עמוס שם'}
        </button>
      }
    >
      <div className="space-y-6 pt-2">
        {/* GPS Proximity Badge */}
        {isGpsVerified && (
          <div className="flex items-center justify-center gap-1.5 rounded-full bg-calm/15 px-3.5 py-2 text-xs font-bold text-calm-ink ring-1 ring-calm/30">
            <span>📍 זוהית בעגלה! דיווח מאומת מהשטח (+20 נק׳ בונוס)</span>
          </div>
        )}
        {/* Step 1 — status */}
        <section>
          <StepTitle n={1}>כמה עמוס עכשיו?</StepTitle>
          <div className="grid gap-2" role="radiogroup" aria-label="מצב העומס">
            {REPORT_STATUS_OPTIONS.map((opt) => {
              const active = status === opt.status
              const meta = STATUS_META[opt.status]
              return (
                <button
                  key={opt.status}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickStatus(opt.status)}
                  className={`flex items-center gap-3 rounded-2xl p-3.5 text-start transition active:scale-[0.99] ${
                    active ? `${meta.softBgClass} ring-2 ring-current ${meta.textClass}` : 'bg-surface ring-1 ring-forest/10 hover:bg-oat'
                  }`}
                >
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {opt.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-display text-lg font-bold ${active ? meta.textClass : 'text-ink'}`}>
                      {opt.label} <span className="text-sm font-medium opacity-70">({opt.range})</span>
                    </span>
                    <span className="block text-sm text-ink/60">{opt.hint}</span>
                  </span>
                  {active && <Check size={22} className={meta.textClass} />}
                </button>
              )
            })}
          </div>
        </section>

        {/* Step 2 — exact wait */}
        <section>
          <StepTitle n={2}>כמה זמן בערך מחכים?</StepTitle>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-forest/10">
            <div className="mb-3 flex items-baseline justify-center gap-1.5">
              <span className={`font-display text-4xl font-bold ${STATUS_META[effectiveStatus].textClass}`}>{wait}</span>
              <span className="text-sm font-medium text-ink/60">דק׳ המתנה</span>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_REPORT_WAIT}
              step={1}
              value={wait}
              onChange={(e) => changeWait(Number(e.target.value))}
              aria-label="זמן המתנה בדקות"
              aria-valuetext={`${wait} דקות`}
              className="wait-slider w-full"
            />
            <div className="mt-1.5 flex justify-between text-xs text-ink/50">
              <span>0</span>
              <span>15</span>
              <span>30</span>
              <span>{MAX_REPORT_WAIT}+</span>
            </div>
          </div>
        </section>

        {/* Step 3 — field tags */}
        <section>
          <StepTitle n={3}>מה המצב בשטח?</StepTitle>
          <div className="flex flex-wrap gap-2">
            {REPORT_FIELD_TAGS.map((tag) => {
              const active = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                    active ? 'bg-forest text-cream shadow-sm' : 'bg-surface text-ink ring-1 ring-forest/15 hover:bg-oat'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>

          {/* Photo attachment */}
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative inline-block overflow-hidden rounded-xl border border-forest/15 bg-oat/50 shadow-sm">
                <img
                  src={imageUrl}
                  alt="תמונת מצב מהשטח"
                  className="h-28 w-36 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-1.5 start-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white transition hover:bg-ink"
                  aria-label="הסר תמונה"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-1 right-1 rounded bg-forest/80 px-1.5 py-0.5 text-[10px] font-bold text-cream">
                  +10 נק׳ בונוס ✨
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-dashed border-forest/30 bg-surface px-4 py-2.5 text-sm font-medium text-forest transition hover:bg-oat active:scale-95"
              >
                <Camera size={18} />
                <span>הוסף תמונת שטח (+10 נק׳)</span>
              </button>
            )}
          </div>

          <label className="mt-3 block">
            <span className="sr-only">טיפ קצר</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={2}
              placeholder="טיפ קצר לבאים אחריך..."
              className="w-full resize-none rounded-2xl border-0 bg-surface px-4 py-3 text-base text-ink shadow-sm ring-1 ring-forest/10 placeholder:text-ink/40 focus:ring-2 focus:ring-forest focus:outline-none"
            />
            <span className="block text-end text-xs text-ink/40">
              {note.length}/{NOTE_MAX}
            </span>
          </label>
        </section>
      </div>
    </Modal>
  )
}
