import { useState } from 'react'
import { Coffee, Loader2, Truck } from 'lucide-react'
import type { PlaceKind } from '../types'

interface Props {
  onCancel: () => void
  onSave: (input: { name: string; kind: PlaceKind }) => Promise<void>
  error: string | null
}

/** Crosshair pinned to the map center: the user moves the map under it */
export function AddCrosshair({ top }: { top: number | string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1050]" aria-hidden>
      {/* The dot at the bottom sits exactly on the map center */}
      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-[calc(100%-4px)]" style={{ top }}>
        <div className="grid size-11 place-items-center rounded-full bg-ink text-surface shadow-lg ring-4 ring-surface">
          <Truck className="size-5" />
        </div>
        <div className="mx-auto h-4 w-0.5 bg-ink" />
        <div className="mx-auto size-2 rounded-full bg-ink" />
      </div>
    </div>
  )
}

export function AddPlaceForm({ onCancel, onSave, error }: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<PlaceKind>('cart')
  const [saving, setSaving] = useState(false)
  const valid = name.trim().length >= 2

  return (
    <form
      className="animate-rise px-4 pb-6"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || saving) return
        setSaving(true)
        try {
          await onSave({ name: name.trim(), kind })
        } finally {
          setSaving(false)
        }
      }}
    >
      <h2 className="text-xl font-bold">הוספת מקום חסר</h2>
      <p className="mt-1 text-sm text-muted">הזיזו את המפה כך שהסיכה תעמוד בדיוק על המקום.</p>

      <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="סוג המקום">
        {(
          [
            { v: 'cart', label: 'עגלת קפה', Icon: Truck },
            { v: 'cafe', label: 'בית קפה', Icon: Coffee },
          ] as const
        ).map(({ v, label, Icon }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={kind === v}
            onClick={() => setKind(v)}
            className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 font-semibold ${
              kind === v ? 'border-ink bg-ink text-surface' : 'border-line'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">שם</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={kind === 'cart' ? 'למשל: עגלת הקפה בחניון המעיין' : 'שם בית הקפה'}
          className="mt-1 w-full rounded-2xl border border-line bg-page px-4 py-3 text-base outline-none focus:border-ink"
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 text-sm text-busy-ink">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-2xl border border-line py-3 font-semibold">
          ביטול
        </button>
        <button
          type="submit"
          disabled={!valid || saving}
          className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-3 font-semibold text-surface disabled:opacity-40"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          הוספה למפה
        </button>
      </div>
    </form>
  )
}
