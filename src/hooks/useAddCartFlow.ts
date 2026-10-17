import { useCallback, useState } from 'react'
import type { CoffeeCart, LatLng } from '../types/cart'
import { EMPTY_DRAFT, draftCoordinates, type CartDraft } from '../components/AddCartModal'
import { regionForLatLng } from '../data/regions'
import { makeCartId } from '../services/cartService'
import type { Notify } from './useToast'

const WAIT_BY_STATUS = { calm: 3, moderate: 10, busy: 22 } as const

/** "Add a cart": the form draft, picking a spot on the map, and saving. */
export function useAddCartFlow(
  addCarts: (carts: CoffeeCart[]) => Promise<CoffeeCart[]>,
  notify: Notify,
  onAdded: (cart: CoffeeCart) => void,
) {
  const [open, setOpen] = useState(false)
  const [pickMode, setPickMode] = useState(false)
  const [draft, setDraft] = useState<CartDraft>(EMPTY_DRAFT)

  const start = useCallback(() => {
    setPickMode(false)
    setOpen(true)
  }, [])
  const close = useCallback(() => setOpen(false), [])

  /** Hides the form so the next map tap picks the location. */
  const startPick = useCallback(() => {
    setOpen(false)
    setPickMode(true)
  }, [])
  const cancelPick = useCallback(() => {
    setPickMode(false)
    setOpen(true)
  }, [])
  const pick = useCallback((loc: LatLng) => {
    setDraft((d) => ({ ...d, lat: loc.lat.toFixed(5), lng: loc.lng.toFixed(5) }))
    setPickMode(false)
    setOpen(true)
  }, [])

  const reset = useCallback(() => {
    setOpen(false)
    setPickMode(false)
    setDraft(EMPTY_DRAFT)
  }, [])

  const submit = useCallback(async () => {
    const coordinates = draftCoordinates(draft)
    if (!coordinates) return
    const cart: CoffeeCart = {
      id: makeCartId('user'),
      name: draft.name.trim(),
      area: draft.area.trim() || 'נוסף ע״י משתמשים',
      description: draft.description.trim() || 'עגלה שנוספה ע״י הקהילה — עוד אין עליה הרבה מידע. נמצאים שם? דווחו!',
      coordinates,
      region: draft.region ?? regionForLatLng(coordinates),
      source: 'user',
      openingHours: 'שעות פתיחה לא ידועות',
      rating: 0,
      reviewCount: 0,
      status: draft.status,
      waitMinutes: WAIT_BY_STATUS[draft.status],
      specialties: [],
      tags: draft.tags,
      lastUpdated: new Date().toISOString(),
      dataSource: 'live',
      fieldTags: [],
    }
    const added = await addCarts([cart])
    if (added.length === 0) {
      notify({ emoji: '📍', title: 'כבר יש עגלה בדיוק במיקום הזה', subtitle: 'אפשר לבחור נקודה אחרת על המפה' })
      return
    }
    reset()
    onAdded(cart)
    notify({ emoji: '🎉', title: `${cart.name} נוספה למפה!`, subtitle: 'תודה שעזרת לקהילה ☕', celebrate: true })
  }, [draft, addCarts, notify, onAdded, reset])

  return { open, start, close, pickMode, startPick, cancelPick, pick, draft, setDraft, submit, reset }
}
