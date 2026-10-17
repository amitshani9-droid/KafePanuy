import { useState, type ReactNode } from 'react'
import { Crosshair, LocateFixed, Loader2, Plus } from 'lucide-react'
import type { CrowdStatus, FilterTag, LatLng, Region } from '../types/cart'
import { FILTER_TAG_ORDER, STATUS_META, TAG_LABELS } from '../data/filters'
import { REGION_LABELS, regionForLatLng } from '../data/regions'
import { REPORT_STATUS_OPTIONS } from '../data/rewards'
import Modal from './Modal'

export interface CartDraft {
  name: string
  area: string
  lat: string
  lng: string
  /** null = derive from coordinates */
  region: Region | null
  tags: FilterTag[]
  status: CrowdStatus
  description: string
}

export const EMPTY_DRAFT: CartDraft = {
  name: '',
  area: '',
  lat: '',
  lng: '',
  region: null,
  tags: [],
  status: 'calm',
  description: '',
}

/** Generous Israel bounding box — just catches typos like swapped lat/lng. */
const IL_BOUNDS = { south: 29.4, north: 33.4, west: 34.2, east: 35.95 }

export function draftCoordinates(d: CartDraft): LatLng | null {
  const lat = Number(d.lat)
  const lng = Number(d.lng)
  if (!d.lat.trim() || !d.lng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < IL_BOUNDS.south || lat > IL_BOUNDS.north || lng < IL_BOUNDS.west || lng > IL_BOUNDS.east) return null
  return { lat, lng }
}

interface AddCartModalProps {
  draft: CartDraft
  onChange: (draft: CartDraft) => void
  onPickOnMap: () => void
  onClose: () => void
  onSubmit: () => void
}

const inputClass =
  'w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-base text-ink ring-1 ring-forest/15 placeholder:text-ink/40 focus:ring-2 focus:ring-forest focus:outline-none'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-ink/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-busy">{hint}</span>}
    </label>
  )
}

export default function AddCartModal({ draft, onChange, onPickOnMap, onClose, onSubmit }: AddCartModalProps) {
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const set = <K extends keyof CartDraft>(key: K, value: CartDraft[K]) => onChange({ ...draft, [key]: value })
  const coords = draftCoordinates(draft)
  const autoRegion = coords ? regionForLatLng(coords) : null
  const nameOk = draft.name.trim().length >= 2
  const coordsTouched = draft.lat.trim() !== '' || draft.lng.trim() !== ''

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setLocateError('הדפדפן שלך לא תומך במיקום')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ ...draft, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) })
        setLocating(false)
      },
      () => {
        setLocateError('לא הצלחנו לקבל מיקום — אפשר לבחור על המפה')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function submit() {
    setTriedSubmit(true)
    if (nameOk && coords) onSubmit()
  }

  function toggleTag(tag: FilterTag) {
    set('tags', draft.tags.includes(tag) ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag])
  }

  return (
    <Modal
      onClose={onClose}
      title={
        <>
          הוספת עגלה חדשה ☕
          <span className="mt-0.5 block font-body text-sm font-normal text-ink/60">
            מכירים עגלה או בית קפה שחסרים במפה? ספרו לנו
          </span>
        </>
      }
      footer={
        <button
          type="button"
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3.5 font-display text-base font-bold text-cream transition hover:bg-forest-light active:scale-[0.98]"
        >
          <Plus size={18} />
          הוסף למפה
        </button>
      }
    >
      <div className="space-y-4 pt-2">
        <Field label="שם העגלה / בית הקפה *" hint={triedSubmit && !nameOk ? 'צריך שם (לפחות 2 תווים)' : undefined}>
          <input
            type="text"
            value={draft.name}
            maxLength={40}
            onChange={(e) => set('name', e.target.value)}
            placeholder="למשל: העגלה של יוסי"
            className={inputClass}
          />
        </Field>

        <Field label="יישוב / מיקום">
          <input
            type="text"
            value={draft.area}
            maxLength={60}
            onChange={(e) => set('area', e.target.value)}
            placeholder="למשל: כניסה למושב, ליד הבריכה"
            className={inputClass}
          />
        </Field>

        {/* Location */}
        <section className="rounded-2xl bg-surface p-3 ring-1 ring-forest/10">
          <div className="mb-2 text-xs font-bold text-ink/70">מיקום על המפה *</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onPickOnMap}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-forest py-2.5 text-sm font-bold text-cream hover:bg-forest-light"
            >
              <Crosshair size={16} />
              בחר על המפה
            </button>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-cream py-2.5 text-sm font-bold text-forest ring-1 ring-forest/15 hover:bg-oat disabled:opacity-60"
            >
              {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              המיקום שלי
            </button>
          </div>
          {locateError && <p className="mt-2 text-xs text-busy">{locateError}</p>}

          <div className="mt-3 grid grid-cols-2 gap-2" dir="ltr">
            <input
              type="text"
              inputMode="decimal"
              value={draft.lat}
              onChange={(e) => set('lat', e.target.value)}
              placeholder="Lat 32.3712"
              aria-label="קו רוחב"
              className={`${inputClass} text-left`}
            />
            <input
              type="text"
              inputMode="decimal"
              value={draft.lng}
              onChange={(e) => set('lng', e.target.value)}
              placeholder="Lng 34.8924"
              aria-label="קו אורך"
              className={`${inputClass} text-left`}
            />
          </div>
          {coords ? (
            <p className="mt-2 text-xs text-calm-ink">✓ מיקום תקין</p>
          ) : (
            (triedSubmit || coordsTouched) && (
              <p className="mt-2 text-xs text-busy">צריך מיקום בתוך ישראל — בחרו על המפה או הקלידו קואורדינטות</p>
            )
          )}
        </section>

        <Field label="אזור">
          <select
            value={draft.region ?? ''}
            onChange={(e) => set('region', (e.target.value || null) as Region | null)}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">{autoRegion ? `אוטומטי לפי המיקום — ${REGION_LABELS[autoRegion]}` : 'אוטומטי לפי המיקום'}</option>
            {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-ink/70">מה יש שם?</span>
          <div className="flex flex-wrap gap-2">
            {FILTER_TAG_ORDER.map((tag) => {
              const active = draft.tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    active ? 'bg-forest text-cream' : 'bg-surface text-ink ring-1 ring-forest/15 hover:bg-oat'
                  }`}
                >
                  {TAG_LABELS[tag].emoji} {TAG_LABELS[tag].label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-ink/70">כמה עמוס שם עכשיו?</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="מצב העומס">
            {REPORT_STATUS_OPTIONS.map((opt) => {
              const active = draft.status === opt.status
              const meta = STATUS_META[opt.status]
              return (
                <button
                  key={opt.status}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('status', opt.status)}
                  className={`rounded-xl py-2 text-sm font-bold transition ${
                    active ? `${meta.softBgClass} ring-2 ring-current ${meta.textClass}` : 'bg-surface text-ink ring-1 ring-forest/10'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <Field label="כמה מילים על המקום (לא חובה)">
          <textarea
            value={draft.description}
            maxLength={160}
            rows={2}
            onChange={(e) => set('description', e.target.value)}
            placeholder="מה מיוחד שם? צל, נוף, מאפים..."
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>
    </Modal>
  )
}
